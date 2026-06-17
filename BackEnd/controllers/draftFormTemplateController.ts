import { Controller, Get, Post, Delete, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
// @ts-ignore
import DraftFormTemplate from '../models/DraftFormTemplate.js';
// Interface for creating or updating a draft form template

export interface DraftFormTemplateCreationParams {
	/** JSON-serialised form layout (same format as FormTemplate) */
	template: string;
	/** If provided, update the existing draft instead of creating a new one */
	draftId?: string;
}
// Interface for listing drafts (header only - lightweight response)

export interface DraftFormTemplateHeader {
	_id: string; // Draft unique identifier
	title: string;// Draft title (extracted from template name)
	updatedAt: string;// Last modification timestamp
}
// Interface for full draft content (used for editing/resuming)

export interface DraftFormTemplateContent {
	_id: string;
	title: string;
	template: string;// Full JSON string of the form layout
	updatedAt: string;
}

@Route('draftFormTemplates')
@Tags('DraftFormTemplates')
export class DraftFormTemplateController extends Controller {

	/**
	 * Create or update a form template draft.
	 * If draftId is supplied, the existing draft is updated in place.
	 * Otherwise a new draft document is created.
	 * 
	 * Use case: Auto-save functionality in form builder - users can save work in progress
	 * before finalizing and creating a published template.
	 */
	@Post()
	@Response('400', 'Invalid or missing template')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden — draft belongs to another user')
	@Response('404', 'Draft not found')
	public async saveDraft(
		@Request() req: express.Request,
		@Body() requestBody: DraftFormTemplateCreationParams
	): Promise<DraftFormTemplateContent | { message: string; }> {
		// Extract authenticated user ID from request (JWT or session)

		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const { template, draftId } = requestBody;
		// Validate required template field

		if (!template) {
			this.setStatus(400);
			return { message: 'Template string is required' };
		}
		// Validate that template is valid JSON

		let parsedTemplate: any;
		try {
			parsedTemplate = JSON.parse(template);
		} catch {
			this.setStatus(400);
			return { message: 'Template must be a valid JSON string' };
		}
		
		// validate loops
		if (parsedTemplate.flow && parsedTemplate.flow.nodes && parsedTemplate.flow.edges) {
			const adj: Record<string, string[]> = {};
			parsedTemplate.flow.nodes.forEach((n: any) => adj[n.id] = []);
			parsedTemplate.flow.edges.forEach((e: any) => {
				if (adj[e.source]) adj[e.source].push(e.target);
			});

			let hasCycle = false;
			const state: Record<string, number> = {};

			const dfs = (u: string) => {
				state[u] = 1;
				for (const v of (adj[u] || [])) {
					if (state[v] === 1) {
						hasCycle = true;
						return;
					} else if (!state[v]) {
						dfs(v);
						if (hasCycle) return;
					}
				}
				state[u] = 2;
			};

			for (const n of parsedTemplate.flow.nodes) {
				if (!state[n.id]) {
					dfs(n.id);
					if (hasCycle) break;
				}
			}

			if (hasCycle) {
				this.setStatus(400);
				return { message: 'Template flow contains a cycle/loop' };
			}
		}

		// Extract title from template's name property, fallback to 'Untitled Draft'
		const title = parsedTemplate.name || 'Untitled Draft';

		// Update existing draft
		if (draftId) {
			const existing = await DraftFormTemplate.findById(draftId);
						// Check if draft exists

			if (!existing) {
				this.setStatus(404);
				return { message: 'Draft not found' };
			}
						// Security: Verify the draft belongs to the authenticated user

			if (existing.createdBy.toString() !== userId) {
				this.setStatus(403);
				return { message: 'Forbidden' };
			}
						// Update draft fields

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
	 * Get the count of drafts for the authenticated user (lightweight — dashboard counter).
	 	 */
	@Get('count')
	@Response('401', 'Unauthorized')
	public async getMyDraftsCount(
		@Request() req: express.Request
	): Promise<{ count: number } | { message: string; }> {

		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}
		// Count only drafts owned by this user

		const count = await DraftFormTemplate.countDocuments({ createdBy: userId });
		return { count };
	}

	/**
	 * List draft headers for the authenticated user (title + updatedAt).
	 */
	@Get()
	@Response('401', 'Unauthorized')
	public async listMyDrafts(
		@Request() req: express.Request
	): Promise<DraftFormTemplateHeader[] | { message: string; }> {

		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}
		// Find all drafts for this user

		const drafts = await DraftFormTemplate.find({ createdBy: userId })
			.select('_id title updatedAt')
			.sort({ updatedAt: -1 })
			.lean();

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
	): Promise<DraftFormTemplateContent | { message: string; }> {

		
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}
		// Find draft by ID

		const draft = await DraftFormTemplate.findById(id);
				// Check if exists

		if (!draft) {
			this.setStatus(404);
			return { message: 'Draft not found' };
		}
				// Security: Verify ownership

		if (draft.createdBy.toString() !== userId) {
			this.setStatus(403);
			return { message: 'Forbidden' };
		}

		return draft as unknown as DraftFormTemplateContent;
	}
	/**
	 * Delete a draft after user has saved it as complete (Clicked "CREATE TEMPLATE")
	 */
	@Delete('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden — draft belongs to another user')
	@Response('404', 'Draft not found')
	public async deleteDraft(
		@Request() req: express.Request,
		@Path() id: string
	): Promise<{ message: string; }> {

		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}		
		// Find draft to verify ownership before deletion


		const draft = await DraftFormTemplate.findById(id);
		if (!draft) {
			this.setStatus(404);
			return { message: 'Draft not found' };
		}
				// Security: Verify ownership

		if (draft.createdBy.toString() !== userId) {
			this.setStatus(403);
			return { message: 'Forbidden' };
		}
		// Delete the draft

		await DraftFormTemplate.findByIdAndDelete(id);
		return { message: 'Draft deleted successfully' };
	}
}
