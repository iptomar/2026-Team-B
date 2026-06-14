import { Controller, Post, Get, Path, Route, Body, Tags, Response } from 'tsoa';
// @ts-ignore
import BugReport from '../models/BugReport.js';

// Interface for creating a new bug report

export interface BugReportCreationParams {
	userId: string; // ID of the user submitting the report
	title: string; // Short summary of the issue
	description: string;// Detailed explanation of the bug
	image?: string; // Optional base64 encoded image or URL screenshot
}
// Interface for full bug report response

export interface BugReportResponse {
	_id: string;
	user: any;// Populated user object
	title: string;
	description: string;
	image?: string;
	createdAt: Date;
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
	public async createBugReport(@Body() requestBody: BugReportCreationParams): Promise<BugReportResponse | { message: string; }> {
		const { userId, title, description, image } = requestBody;
				// Validate required fields

		if (!userId || !title || !description) {
			this.setStatus(400);
			return { message: 'userId, title, and description are required.' };
		}

		try {
			// Create new bug report document
			const bugReport = new BugReport({
				user: userId,// Reference to User model
				title,
				description,
				image: image || null// Set image to null if not provide
			});
			// Save to database

			await bugReport.save();
			// Return the created report

			return bugReport as unknown as BugReportResponse;
		} catch (error: any) {
						// Handle any database or validation errors

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
				.select('-description -image')
				.sort({ createdAt: -1 });

			return reports as unknown as BugReportSummaryDTO[];
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
			// Return the full report

			return report as unknown as BugReportResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}
}
