import { Controller, Get, Post, Put, Route, Body, Path, Tags, Response, Request } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
// @ts-ignore
import Role from '../models/Role.js';
// @ts-ignore
import User from '../models/User.js';

export interface RoleCreationParams {
	name: string;
	description?: string;
	translations?: Record<string, string>;
}

export interface RoleResponse {
	_id: string;
	name: string;
	description?: string;
	softDelete: boolean;
	translations?: Record<string, string>;
}

@Route('roles')
@Tags('Roles')
export class RoleController extends Controller {

	// Removed duplicate extractUserIdFromRequest

	/**
	 * Check if the caller is authenticated. Returns userId or null.
	 */
	private requireAuth(req: express.Request): string | null {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
		}
		return userId;
	}

	/**
	 * Check if the given user has the 'admin' role.
	 */
	private async isAdmin(userId: string): Promise<boolean> {
		const user = await User.findById(userId).populate('roles').select('roles').lean();
		if (!user || !user.roles) return false;
		return user.roles.some((r: any) => r.name?.toLowerCase() === 'admin');
	}

	/**
	 * Require authenticated admin. Returns userId on success, sets status and returns null on failure.
	 */
	private async requireAdmin(req: express.Request): Promise<string | null> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return null;
		}
		const admin = await this.isAdmin(userId);
		if (!admin) {
			this.setStatus(403);
			return null;
		}
		return userId;
	}

	/**
	 * list existing roles that are not soft-deleted (authenticated users only).
	 */
	@Get()
	@Response('401', 'Unauthorized')
	public async getRoles(@Request() req: express.Request): Promise<RoleResponse[] | { message: string }> {
		const userId = this.requireAuth(req);
		if (!userId) return { message: 'Authentication required' };

		// roles where softDelete isn't true will be ignored
		const roles = await Role.find({ $or: [{ softDelete: false }, { softDelete: { $exists: false } }] });
		return roles as unknown as RoleResponse[];
	}

	/**
	 * add a new role (admin only).
	 */
	@Post()
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	@Response('409', 'Role already exists')
	public async addRole(@Request() req: express.Request, @Body() requestBody: RoleCreationParams): Promise<RoleResponse | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		try {
			const role = new Role(requestBody);
			await role.save();
			return role as unknown as RoleResponse;
		} catch (error: any) {
			this.setStatus(409);
			return { message: error.message };
		}
	}

	/**
	 * update an existing role (admin only).
	 */
	@Put('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	@Response('404', 'Role not found')
	public async updateRole(@Request() req: express.Request, @Path() id: string, @Body() requestBody: RoleCreationParams): Promise<RoleResponse | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const role = await Role.findById(id);
		if (!role) {
			this.setStatus(404);
			return { message: 'Role not found' };
		}

		if (requestBody.name) role.name = requestBody.name;
		if (requestBody.description !== undefined) role.description = requestBody.description;
		if (requestBody.translations) role.translations = requestBody.translations;

		await role.save();
		return role as unknown as RoleResponse;
	}

	/**
	 * soft delete a role by ID (admin only).
	 */
	@Post('{id}/soft-delete')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	public async softDeleteRole(@Request() req: express.Request, @Path() id: string): Promise<{ message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const role = await Role.findByIdAndUpdate(id, { softDelete: true });
		if (!role) {
			this.setStatus(404);
			return { message: 'Role not found' };
		}
		return { message: 'Role soft-deleted successfully' };
	}
}
