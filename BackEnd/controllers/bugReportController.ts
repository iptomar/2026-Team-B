import { Controller, Post, Get, Path, Route, Body, Tags, Response } from 'tsoa';
// @ts-ignore
import BugReport from '../models/BugReport.js';

export interface BugReportCreationParams {
	userId: string;
	title: string;
	description: string;
	image?: string;
}

export interface BugReportResponse {
	_id: string;
	user: any;
	title: string;
	description: string;
	image?: string;
	createdAt: Date;
}

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
	 */
	@Post()
	@Response('400', 'Missing required parameters')
	@Response('500', 'Internal Server Error')
	public async createBugReport(@Body() requestBody: BugReportCreationParams): Promise<BugReportResponse | { message: string; }> {
		const { userId, title, description, image } = requestBody;

		if (!userId || !title || !description) {
			this.setStatus(400);
			return { message: 'userId, title, and description are required.' };
		}

		try {
			const bugReport = new BugReport({
				user: userId,
				title,
				description,
				image: image || null
			});

			await bugReport.save();

			return bugReport as unknown as BugReportResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Retrieve a list of all bug reports.
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
	 */
	@Get('{id}')
	@Response('404', 'Bug Report not found')
	@Response('500', 'Internal Server Error')
	public async getBugReportById(@Path() id: string): Promise<BugReportResponse | { message: string; }> {
		try {
			const report = await BugReport.findById(id).populate('user', 'username email avatarIcon');
			
			if (!report) {
				this.setStatus(404);
				return { message: 'Bug Report not found' };
			}

			return report as unknown as BugReportResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}
}
