import { Controller, Route, Get, Post, Delete, Body, Path, Tags, Request } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
import SavedGroup from '../models/SavedGroup.js';

interface SavedGroupCreationParams {
	label: string;
	content: string;
}

interface SavedGroupResponse {
	_id: string;
	label: string;
	content: string;
	createdBy?: string | null;
}

@Route('savedGroups')
@Tags('SavedGroups')
export class SavedGroupController extends Controller {
	/**
	 * Extract user ID from JWT token in the Authorization header.
	 */
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
	 * Get all saved groups
	 */
	@Get('/')
	public async getSavedGroups(): Promise<SavedGroupResponse[]> {
		const groups = await SavedGroup.find().lean();
		return groups.map(g => ({
			_id: g._id.toString(),
			label: g.label,
			content: g.content,
			createdBy: g.createdBy?.toString() || null
		}));
	}

	/**
	 * Create or update a saved group by label
	 */
	@Post('/')
	public async saveGroup(
		@Body() requestBody: SavedGroupCreationParams,
		@Request() request: express.Request
	): Promise<SavedGroupResponse | { message: string }> {
		const userId = this.extractUserIdFromRequest(request);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}
		
		const updatedGroup = await SavedGroup.findOneAndUpdate(
			{ label: requestBody.label },
			{
				label: requestBody.label,
				content: requestBody.content,
				...(userId ? { createdBy: userId } : {})
			},
			{ new: true, upsert: true }
		);

		return {
			_id: updatedGroup._id.toString(),
			label: updatedGroup.label,
			content: updatedGroup.content,
			createdBy: updatedGroup.createdBy?.toString() || null
		};
	}

	/**
	 * Delete a saved group
	 */
	@Delete('{id}')
	public async deleteGroup(@Request() request: express.Request, @Path() id: string): Promise<void | { message: string }> {
		const userId = this.extractUserIdFromRequest(request);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const result = await SavedGroup.findByIdAndDelete(id);
		if (!result) {
			this.setStatus(404);
			return;
		}
		this.setStatus(204);
	}
}
