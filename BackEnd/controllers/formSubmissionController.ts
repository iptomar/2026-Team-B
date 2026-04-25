import { Controller, Post, Route, Body, Request, Tags, Response } from 'tsoa';
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
	formData: string; // JSON-encoded key-value map of fieldId -> value
}

export interface FormSubmissionResponse {
	_id: string;
	templateId: string;
	submitterId: string;
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
}
