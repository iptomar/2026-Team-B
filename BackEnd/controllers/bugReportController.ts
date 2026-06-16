import { Controller, Post, Get, Put, Path, Route, FormField, UploadedFiles, Tags, Response, Request } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
import crypto from 'crypto';
import path from 'path';
import { uploadBlob, generateSasUrl } from '../services/blobService.js';
// @ts-ignore
import BugReport from '../models/BugReport.js';
// @ts-ignore
import User from '../models/User.js';
// Interface for full bug report response

export interface BugReportResponse {
	_id: string;
	user: any;
	title: string;
	description: string;
	attachments: any[];
	createdAt: Date;
	status: string;
}
// Interface for summary view (list endpoint) - excludes description and image for performance
export interface BugReportSummaryDTO {
	_id: string;
	title: string;
	user: {
		_id: string;
		username: string;
		email: string;
	};
	createdAt: Date;
	status: string;
}

@Route('bug-reports')
@Tags('Bug Reports')
export class BugReportController extends Controller {
	/**
	 * Create a new bug report.
	 * Allows authenticated users to submit bug reports with optional screenshots.
	 */
	@Post()
	@Response('400', 'Missing required parameters')
	@Response('500', 'Internal Server Error')
	public async createBugReport(
		@Request() req: express.Request,
		@FormField() title: string,
		@FormField() description: string,
		@UploadedFiles() files?: Express.Multer.File[]
	): Promise<BugReportResponse | { message: string; }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		if (!title || !description) {
			this.setStatus(400);
			return { message: 'title and description are required.' };
		}

		try {
			const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
			const attachments = [];

			if (files && files.length > 0) {
				for (const file of files) {
					const ext = path.extname(file.originalname);
					const blobName = `bug-reports/${userId}/${crypto.randomUUID()}${ext}`;

					await uploadBlob(containerName, blobName, file.buffer, file.mimetype);

					attachments.push({
						originalName: file.originalname,
						blobName,
						containerName,
						contentType: file.mimetype,
						size: file.size,
					});
				}
			}

			const bugReport = new BugReport({
				user: userId,
				title,
				description,
				attachments
			});

			await bugReport.save();
			return bugReport as unknown as BugReportResponse;
		} catch (error: any) {
			console.error(error);
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Retrieve a list of all bug reports.
	 * Returns a summary view (without description/image) for efficient listing.
	 * Sorted by newest first.
	 */
	@Get()
	@Response('500', 'Internal Server Error')
	public async getBugReports(): Promise<BugReportSummaryDTO[] | { message: string; }> {
		try {
			const reports = await BugReport.find()
				.populate('user', 'username email')
				.select('-description -attachments')
				.sort({ createdAt: -1 });

			return (reports as any[]).map(report => ({
				_id: report._id.toString(),
				title: report.title,
				user: report.user,
				createdAt: report.createdAt,
				status: report.status || 'pending'
			})) as unknown as BugReportSummaryDTO[];
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Retrieve a specific bug report by its ID.
	 * Returns the full report including description and image.
	 * Populates user information including avatarIcon for display purposes.
	 */
	@Get('{id}')
	@Response('404', 'Bug Report not found')
	@Response('500', 'Internal Server Error')
	public async getBugReportById(@Path() id: string): Promise<BugReportResponse | { message: string; }> {
		try {
						// Find by ID and populate user fields (username, email, avatarIcon)

			const report = await BugReport.findById(id).populate('user', 'username email avatarIcon');
			// Return 404 if report doesn't exist

			if (!report) {
				this.setStatus(404);
				return { message: 'Bug Report not found' };
			}

			const reportObj = report.toObject ? report.toObject() : report;
			if (reportObj.user && reportObj.user.avatarIcon && reportObj.user.avatarIcon.startsWith('avatars/')) {
				try {
					const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
					reportObj.user.avatarIcon = generateSasUrl(containerName, reportObj.user.avatarIcon, 24);
				} catch (e) {
					console.error('Failed to generate SAS token for bug report reporter avatar', e);
				}
			}

			// Return the full report
			return reportObj as unknown as BugReportResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Retrieve a SAS URL for a bug report attachment
	 */
	@Get('{id}/files/{blobName}/sas')
	@Response('403', 'Forbidden')
	@Response('404', 'Not found')
	@Response('500', 'Internal Server Error')
	public async getBugReportAttachmentSas(
		@Request() req: express.Request,
		@Path() id: string,
		@Path() blobName: string
	): Promise<{ url: string } | { message: string }> {
		try {
			const userId = extractUserIdFromRequest(req);
			if (!userId) {
				this.setStatus(401);
				return { message: 'Unauthorized' };
			}

			const report = await BugReport.findById(id).lean();
			if (!report) {
				this.setStatus(404);
				return { message: 'Bug Report not found' };
			}

			const requestingUser = await User.findById(userId).populate('roles').lean();
			const isAdmin = requestingUser?.roles?.some((r: any) => r.name?.toLowerCase() === 'admin');
			
			// Only submitter or admin can access
			if (report.user.toString() !== userId && !isAdmin) {
				this.setStatus(403);
				return { message: 'Forbidden' };
			}

			// The blobName from URL might be encoded, and the route might match only part.
			// Let's decode it just in case. But wait, blobName in route path usually gets decoded.
			const decodedBlobName = decodeURIComponent(blobName);
			
			// Actually blobName includes slashes (e.g., bug-reports/userId/uuid.png).
			// TSOA @Path() doesn't handle slashes well. So we need to match the full blobname from the attachment array.
			const attachment = (report.attachments || []).find((a: any) => a.blobName.endsWith(decodedBlobName) || a.blobName === decodedBlobName);
			
			if (!attachment) {
				this.setStatus(404);
				return { message: 'File not found in this report' };
			}

			const url = generateSasUrl(attachment.containerName, attachment.blobName, 15);
			return { url };
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Mark a bug report as resolved.
	 * Requires admin role.
	 */
	@Put('{id}/resolve')
	@Response('401', 'Unauthorized')
	@Response('404', 'Bug report not found')
	@Response('500', 'Internal Server Error')
	public async resolveBugReport(
		@Path() id: string,
		@Request() req: express.Request
	): Promise<BugReportResponse | { message: string }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		try {
			const requestingUser = await User.findById(userId).populate('roles');
			if (!requestingUser) {
				this.setStatus(401);
				return { message: 'User not found' };
			}

			const isAdmin = requestingUser.roles.some((r: any) => r.name.toLowerCase() === 'admin');
			if (!isAdmin) {
				this.setStatus(401);
				return { message: 'Unauthorized. Admin access required.' };
			}

			const bugReport = await BugReport.findByIdAndUpdate(
				id,
				{ status: 'resolved' },
				{ new: true }
			).populate('user', 'username email avatarIcon');

			if (!bugReport) {
				this.setStatus(404);
				return { message: 'Bug report not found' };
			}

			const reportObj = bugReport.toObject ? bugReport.toObject() : bugReport;
			return reportObj as unknown as BugReportResponse;
		} catch (error: any) {
			console.error(error);
			this.setStatus(500);
			return { message: error.message };
		}
	}
}
