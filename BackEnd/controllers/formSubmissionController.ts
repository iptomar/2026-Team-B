import { Controller, Get, Post, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
// @ts-ignore
import FormTemplate from '../models/FormTemplate.js';
// @ts-ignore
import FormSubmission from '../models/FormSubmission.js';
// @ts-ignore
import User from '../models/User.js';

export interface FormSubmissionCreationParams {
	templateId: string;
	formData: string; 
}

export interface FormSubmissionResponse {
	_id: string;
	templateId: string;
	submitterId: string;
	submittedData: string;
	status: string;
	createdAt: string;
}

export interface MySubmission {
	_id: string;
	templateId: string;
	templateTitle: string;
	submittedData: string;
	status: string;
	createdAt: string;
}

@Route('formSubmissions')
@Tags('FormSubmissions')
export class FormSubmissionController extends Controller {

	private extractUserIdFromRequest(req: express.Request): string | null {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return null;
		}

		const token = authHeader.split(' ')[1];
		try {
			const jwtSecret = process.env.JWT_SECRET as string;
			const decoded: any = jwt.verify(token, jwtSecret);
			return decoded.id;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Submit a form instance
	 */
	@Post()
	@Response('400', 'Invalid data or missing fields')
	@Response('401', 'Unauthorized')
	@Response('404', 'Template not found')
	public async submitForm(
		@Request() req: express.Request,
		@Body() requestBody: FormSubmissionCreationParams
	): Promise<FormSubmissionResponse | { message: string }> {

		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const { templateId, formData: formDataStr } = requestBody;

		if (!templateId || formDataStr === undefined) {
			this.setStatus(400);
			return { message: 'templateId and formData are required' };
		}

		let formData: Record<string, any>;
		try {
			formData = JSON.parse(formDataStr);
		} catch {
			this.setStatus(400);
			return { message: 'formData must be a valid JSON string' };
		}

		const templateDoc = await FormTemplate.findById(templateId);
		if (!templateDoc) {
			this.setStatus(404);
			return { message: 'Form template not found' };
		}

		// Reject submission if template has been soft-deleted (deprecated)
		if (templateDoc.softDelete) {
			this.setStatus(409);
			return { message: 'This form template has been deprecated and can no longer be submitted.' };
		}

		// Reject submission if template has been superseded by a newer version
		if (templateDoc.replacedBy) {
			this.setStatus(409);
			return { message: 'A newer version of this form is available. Please refresh and use the latest version.' };
		}

		let parsedTemplate: any;
		try {
			parsedTemplate = JSON.parse(templateDoc.template);
		} catch (error) {
			this.setStatus(500);
			return { message: 'Failed to parse original form template JSON' };
		}

		// Inject submitted values into the template layout
		if (parsedTemplate.layout && Array.isArray(parsedTemplate.layout)) {
			parsedTemplate.layout.forEach((row: any) => {
				if (row.columns && Array.isArray(row.columns)) {
					row.columns.forEach((col: any) => {
						if (col.field && col.field.id) {
							const submittedValue = formData[col.field.id];
							col.field.submittedValue = submittedValue !== undefined ? submittedValue : null;
						}
					});
				}
			});
		}

		// Stringify the augmented template structure
		const augmentedDataStr = JSON.stringify(parsedTemplate);

		const newSubmission = new FormSubmission({
			templateId: templateDoc._id,
			submitterId: userId,
			submittedData: augmentedDataStr,
			status: 'submitted'
		});

		await newSubmission.save();

		return newSubmission as unknown as FormSubmissionResponse;
	}

	/**
	 * Get the current user's submitted forms
	 */
	@Get('my')
	@Response('401', 'Unauthorized')
	public async getMySubmissions(
		@Request() req: express.Request
	): Promise<MySubmission[] | { message: string }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const submissions = await FormSubmission
			.find({ submitterId: userId })
			.sort({ createdAt: -1 })
			.populate('templateId', 'title')
			.lean();

		return submissions.map((s: any) => ({
			_id: s._id.toString(),
			templateId: s.templateId?._id?.toString() ?? s.templateId?.toString(),
			templateTitle: s.templateId?.title ?? 'Unknown Form',
			submittedData: s.submittedData,
			status: s.status,
			createdAt: s.createdAt?.toISOString?.() ?? s.createdAt
		}));
	}

	/**
	 * Get a single submission by ID (for read-only view)
	 */
	@Get('{submissionId}')
	@Response('401', 'Unauthorized')
	@Response('404', 'Submission not found')
	public async getSubmissionById(
		@Path() submissionId: string,
		@Request() req: express.Request
	): Promise<MySubmission | { message: string }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const submission = await FormSubmission
			.findOne({ _id: submissionId, submitterId: userId })
			.populate('templateId', 'title')
			.lean() as any;

		if (!submission) {
			this.setStatus(404);
			return { message: 'Submission not found' };
		}

		return {
			_id: submission._id.toString(),
			templateId: submission.templateId?._id?.toString() ?? submission.templateId?.toString(),
			templateTitle: submission.templateId?.title ?? 'Unknown Form',
			submittedData: submission.submittedData,
			status: submission.status,
			createdAt: submission.createdAt?.toISOString?.() ?? submission.createdAt
		};
	}
}
