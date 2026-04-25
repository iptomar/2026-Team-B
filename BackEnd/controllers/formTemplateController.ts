import { Controller, Get, Post, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// @ts-ignore
import FormTemplate from '../models/FormTemplate.js';
// @ts-ignore
import User from '../models/User.js';

export interface FormTemplateCreationParams {
	template: string;
	previousTemplateId?: string;
}

export interface FormTemplateResponse {
	_id: string;
	title: string;
	description?: string;
	version: number;
	templateGroupId: string;
	template?: string;
	allowedSubmitRoles?: string[];
}

@Route('formTemplates')
@Tags('FormTemplates')
export class FormTemplateController extends Controller {

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
	 * create or update a form template
	 */
	@Post()
	@Response('400', 'Invalid JSON or missing fields')
	@Response('401', 'Unauthorized')
	@Response('404', 'Previous template not found')
	public async createFormTemplate(
		@Request() req: express.Request,
		@Body() requestBody: FormTemplateCreationParams
	): Promise<FormTemplateResponse | { message: string }> {

		// validate user token, identify user by token
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		// validate template
		const { template, previousTemplateId } = requestBody;

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

		// get title and description from template
		const title = parsedTemplate.name || 'Untitled Form';
		const description = parsedTemplate.description || '';

		// extract allowedSubmitRoles from start node
		let allowedSubmitRoles: string[] = [];
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
		const templates = await FormTemplate.find({ replacedBy: null, softDelete: false })
			.select('_id title description version templateGroupId allowedSubmitRoles');
		return templates as unknown as FormTemplateResponse[];
	}

	/**
	 * get a specific form template by ID
	 */
	@Get('{id}')
	@Response('404', 'Template not found')
	public async getTemplateById(@Path() id: string): Promise<FormTemplateResponse | { message: string }> {
		const template = await FormTemplate.findById(id);
		if (!template) {
			this.setStatus(404);
			return { message: 'Template not found' };
		}
		return template as unknown as FormTemplateResponse;
	}
}
