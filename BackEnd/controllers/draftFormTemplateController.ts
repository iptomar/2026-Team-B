import { Controller, Get, Post, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
// @ts-ignore
import DraftFormTemplate from '../models/DraftFormTemplate.js';

export interface DraftFormTemplateCreationParams {
	/** JSON-serialised form layout (same format as FormTemplate) */
	template: string;
	/** If provided, update the existing draft instead of creating a new one */
	draftId?: string;
}

export interface DraftFormTemplateHeader {
	_id: string;
	title: string;
	updatedAt: string;
}

export interface DraftFormTemplateContent {
	_id: string;
	title: string;
	template: string;
	updatedAt: string;
}

@Route('draftFormTemplates')
@Tags('DraftFormTemplates')
export class DraftFormTemplateController extends Controller {

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
		} catch {
			return null;
		}
	}

	/**
	 * Create or update a form template draft.
	 * If draftId is supplied, the existing draft is updated in place.
	 * Otherwise a new draft document is created.
	 */
	@Post()
	@Response('400', 'Invalid or missing template')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden — draft belongs to another user')
	@Response('404', 'Draft not found')
	public async saveDraft(
		@Request() req: express.Request,
		@Body() requestBody: DraftFormTemplateCreationParams
	): Promise<DraftFormTemplateContent | { message: string }> {

		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const { template, draftId } = requestBody;

		if (!template) {
			this.setStatus(400);
			return { message: 'Template string is required' };
		}

		let parsedTemplate: any;
		try {
			parsedTemplate = JSON.parse(template);
		} catch {
			this.setStatus(400);
			return { message: 'Template must be a valid JSON string' };
		}

		const title = parsedTemplate.name || 'Untitled Draft';

		// Update existing draft
		if (draftId) {
			const existing = await DraftFormTemplate.findById(draftId);
			if (!existing) {
				this.setStatus(404);
				return { message: 'Draft not found' };
			}
			if (existing.createdBy.toString() !== userId) {
				this.setStatus(403);
				return { message: 'Forbidden' };
			}
			existing.title = title;
			existing.template = template;
			await existing.save();
			return existing as unknown as DraftFormTemplateContent;
		}

		// Create new draft
		const draft = new DraftFormTemplate({ title, template, createdBy: userId });
		await draft.save();
		return draft as unknown as DraftFormTemplateContent;
	}

	/**
	 * List draft headers for the authenticated user (title + updatedAt).
	 */
	@Get()
	@Response('401', 'Unauthorized')
	public async listMyDrafts(
		@Request() req: express.Request
	): Promise<DraftFormTemplateHeader[] | { message: string }> {

		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const drafts = await DraftFormTemplate.find({ createdBy: userId })
			.select('_id title updatedAt')
			.sort({ updatedAt: -1 });

		return drafts as unknown as DraftFormTemplateHeader[];
	}

	/**
	 * Get the full content of a single draft so the FormBuilder can resume it.
	 */
	@Get('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden — draft belongs to another user')
	@Response('404', 'Draft not found')
	public async getDraftById(
		@Request() req: express.Request,
		@Path() id: string
	): Promise<DraftFormTemplateContent | { message: string }> {

		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const draft = await DraftFormTemplate.findById(id);
		if (!draft) {
			this.setStatus(404);
			return { message: 'Draft not found' };
		}
		if (draft.createdBy.toString() !== userId) {
			this.setStatus(403);
			return { message: 'Forbidden' };
		}

		return draft as unknown as DraftFormTemplateContent;
	}
}
