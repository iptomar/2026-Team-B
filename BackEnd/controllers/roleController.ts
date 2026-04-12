import { Controller, Get, Post, Route, Body, Path, Tags, Response } from 'tsoa';
// @ts-ignore
import Role from '../models/Role.js';

export interface RoleCreationParams {
	name: string;
	description?: string;
}

export interface RoleResponse {
	name: string;
	description?: string;
	softDelete: boolean;
}

@Route('roles')
@Tags('Roles')
export class RoleController extends Controller {
	/**
	 * list existing roles that are not soft-deleted.
	 */
	@Get()
	public async getRoles(): Promise<RoleResponse[]> {
		// roles where softDelete isn't true will be ignored
		const roles = await Role.find({ $or: [{ softDelete: false }, { softDelete: { $exists: false } }] });
		return roles as unknown as RoleResponse[];
	}

	/**
	 * add a new role.
	 */
	@Post()
	@Response('409', 'Role already exists')
	public async addRole(@Body() requestBody: RoleCreationParams): Promise<RoleResponse | { message: string; }> {
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
	 * soft delete a role by ID.
	 */
	@Post('{id}/soft-delete')
	public async softDeleteRole(@Path() id: string): Promise<{ message: string; }> {
		const role = await Role.findByIdAndUpdate(id, { softDelete: true });
		if (!role) {
			this.setStatus(404);
			return { message: 'Role not found' };
		}
		return { message: 'Role soft-deleted successfully' };
	}
}
