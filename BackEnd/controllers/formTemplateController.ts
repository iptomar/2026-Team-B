import { Controller, Get, Post, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
import crypto from 'crypto';
// @ts-ignore
import FormTemplate from '../models/FormTemplate.js';
// @ts-ignore
import User from '../models/User.js';

export interface FormTemplateCreationParams {
	template: string;
	previousTemplateId?: string;
	labels?: string[];
}

export interface FormTemplateResponse {
	_id: string;
	title: string;
	description?: string;
	version: number;
	templateGroupId: string;
	template?: string;
	allowedSubmitRoles?: string[];
	allowedSubmitUnits?: string[];
	availableFrom?: Date;
	availableTo?: Date;
	labels?: any[];
}

@Route('formTemplates')
@Tags('FormTemplates')
export class FormTemplateController extends Controller {

	/**
	 * create or update a form template
	 */
	@Post()
	@Response('400', 'Invalid JSON or missing fields')
	@Response('401', 'Unauthorized')
	@Response('404', 'Previous template not found')
	public async createFormTemplate(
		@Request() req: express.Request,
		@Body() requestBody: FormTemplateCreationParams
	): Promise<FormTemplateResponse | { message: string; }> {

		// validate user token, identify user by token
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		// validate template
		const { template, previousTemplateId, labels } = requestBody;

		// validate if template was provided
		if (!template) {
			this.setStatus(400);
			return { message: 'Template string is required' };
		}

		// parse template
		let parsedTemplate: any;
		try {
			parsedTemplate = JSON.parse(template);
		} catch (error) {
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

		// get title and description from template
		const title = parsedTemplate.name || 'Untitled Form';
		const description = parsedTemplate.description || '';

		// extract allowedSubmitRoles and allowedSubmitUnits from start node
		let allowedSubmitRoles: string[] = [];
		let allowedSubmitUnits: string[] = [];
		if (parsedTemplate.flow && parsedTemplate.flow.nodes) {
			const startNode = parsedTemplate.flow.nodes.find((n: any) => n.type === 'start');
			if (startNode && startNode.data) {
				const rolesToProcess = Array.isArray(startNode.data.allowedSubmitRoles)
					? startNode.data.allowedSubmitRoles
					: (Array.isArray(startNode.data.allowedRoles) ? startNode.data.allowedRoles : []);

				for (const r of rolesToProcess) {
					// Check if it's a valid Mongo ObjectID
					if (/^[0-9a-fA-F]{24}$/.test(r)) {
						allowedSubmitRoles.push(r);
					} else {
						// It might be a role name, look it up
						// @ts-ignore
						const Role = (await import('../models/Role.js')).default;
						const roleObj = await Role.findOne({ name: r });
						if (roleObj) {
							allowedSubmitRoles.push(roleObj._id.toString());
						}
					}
				}
				
				const unitsToProcess = Array.isArray(startNode.data.allowedSubmitUnits) ? startNode.data.allowedSubmitUnits : [];
				for (const u of unitsToProcess) {
					if (/^[0-9a-fA-F]{24}$/.test(u)) {
						allowedSubmitUnits.push(u);
					}
				}
			}
		}

		let availableFrom: Date | undefined;
		let availableTo: Date | undefined;
		if (parsedTemplate.flow && parsedTemplate.flow.nodes) {
			const startNode = parsedTemplate.flow.nodes.find((n: any) => n.type === 'start');
			if (startNode && startNode.data) {
				if (startNode.data.availableFrom) availableFrom = new Date(startNode.data.availableFrom);
				if (startNode.data.availableTo) availableTo = new Date(startNode.data.availableTo);
			}
		}

		// if previous template id is provided, create new template version with incremented version
		if (previousTemplateId) {
			// validate previous template exists
			const prevTemplate = await FormTemplate.findById(previousTemplateId);
			if (!prevTemplate) {
				this.setStatus(404);
				return { message: 'Previous template not found' };
			}

			const newTemplate = new FormTemplate({
				title,
				description,
				template,
				version: prevTemplate.version + 1,
				createdBy: userId,
				templateGroupId: prevTemplate.templateGroupId,
				allowedSubmitRoles,
				allowedSubmitUnits,
				availableFrom,
				availableTo,
				labels,
				replacedBy: null
			});

			await newTemplate.save();

			prevTemplate.replacedBy = newTemplate._id;
			await prevTemplate.save();

			return newTemplate as unknown as FormTemplateResponse;
		} else {
			// if no previous template id, create new template with new template group id
			const newTemplate = new FormTemplate({
				title,
				description,
				template,
				version: 1,
				createdBy: userId,
				templateGroupId: crypto.randomUUID(),
				allowedSubmitRoles,
				allowedSubmitUnits,
				availableFrom,
				availableTo,
				labels,
				replacedBy: null
			});

			await newTemplate.save();

			return newTemplate as unknown as FormTemplateResponse;
		}
	}

	/**
	 * get all active form templates (dropdown data)
	 */
	@Get()
	public async getActiveTemplates(): Promise<FormTemplateResponse[]> {
		const now = new Date();
		const templates = await FormTemplate.find({ 
			replacedBy: null, 
			softDelete: false,
			$and: [
				{ $or: [{ availableFrom: { $exists: false } }, { availableFrom: null }, { availableFrom: { $lte: now } }] },
				{ $or: [{ availableTo: { $exists: false } }, { availableTo: null }, { availableTo: { $gte: now } }] }
			]
		})
			.populate('labels')
			.select('_id title description version templateGroupId allowedSubmitRoles allowedSubmitUnits availableFrom availableTo labels');
		return templates as unknown as FormTemplateResponse[];
	}

	/**
	 * get a specific form template by ID
	 */
	@Get('{id}')
	@Response('404', 'Template not found')
	public async getTemplateById(@Path() id: string): Promise<FormTemplateResponse | { message: string; }> {
		const template = await FormTemplate.findById(id).populate('labels');
		if (!template) {
			this.setStatus(404);
			return { message: 'Template not found' };
		}
		return template as unknown as FormTemplateResponse;
	}

	/**
	 * soft delete a form template by ID
	 */
	@Post('{id}/soft-delete')
	@Response('401', 'Unauthorized')
	@Response('404', 'Template not found')
	public async softDeleteTemplate(
		@Request() req: express.Request,
		@Path() id: string
	): Promise<{ message: string; }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const template = await FormTemplate.findByIdAndUpdate(id, { softDelete: true });
		if (!template) {
			this.setStatus(404);
			return { message: 'Template not found' };
		}

		return { message: 'Template soft-deleted successfully' };
	}
}
