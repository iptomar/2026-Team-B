import { Controller, Get, Post, Put, Delete, Route, Body, Path, Tags, Response, Request } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import Role from '../models/Role.js';

export interface UserCreationParams {
	username: string;
	email: string;
	password?: string; // Optional for edit, required for create, though create enforces manually below.
	roles: string[];
}

export interface UserUpdateParams {
	username?: string;
	email?: string;
	roles?: string[];
	avatarIcon?: string;
}

export interface UserResponse {
	_id: string;
	username: string;
	email: string;
	roles: any[];
	avatarIcon?: string;
	failedAttempts?: number;
	lockedUntil?: Date;
}

@Route('users')
@Tags('Users')
export class UserController extends Controller {

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
		const userId = this.extractUserIdFromRequest(req);
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
	 * list existing users (admin only)
	 */
	@Get()
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	public async getUsers(@Request() req: express.Request): Promise<UserResponse[] | { message: string }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const users = await User.find({ $or: [{ softDelete: false }, { softDelete: { $exists: false } }] }).populate('roles', 'name').select('-password -avatarIcon').lean();
		return users as unknown as UserResponse[];
	}

	/**
	 * create a new user (admin only).
	 */
	@Post()
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	@Response('409', 'User already exists')
	@Response('400', 'Missing parameters')
	public async addUser(@Request() req: express.Request, @Body() requestBody: UserCreationParams): Promise<UserResponse | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const { username, email, password, roles } = requestBody;

		if (!username || !email || !password || !roles || !Array.isArray(roles)) {
			this.setStatus(400);
			return { message: 'Username, email, password, and roles array are required' };
		}

		const lowerEmail = email.toLowerCase();
		if (!lowerEmail.endsWith('@ipt.pt') && !lowerEmail.endsWith('@estt.pt')) {
			this.setStatus(400);
			return { message: 'Only ipt.pt and estt.pt email addresses are allowed.' };
		}

		const existingUser = await User.findOne({
			$or: [{ username: username }, { email: email.toLowerCase() }]
		});

		if (existingUser) {
			this.setStatus(409);
			return { message: 'Username or email unavailable' };
		}

		try {
			const user = new User({
				username,
				email: email.toLowerCase(),
				password,
				roles
			});
			await user.save();

			// Exclude password from the returned object by querying the just saved user
			const savedUser = await User.findById(user._id).populate('roles').select('-password');
			return savedUser as unknown as UserResponse;
		} catch (error: any) {
			this.setStatus(500);
			return { message: error.message };
		}
	}

	/**
	 * Update user details (admin only)
	 */
	@Put('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	@Response('404', 'User not found')
	@Response('409', 'Username or email already in use')
	public async updateUser(@Request() req: express.Request, @Path() id: string, @Body() requestBody: UserUpdateParams): Promise<UserResponse | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const { username, email, roles } = requestBody;

		if (email) {
			const lowerEmail = email.toLowerCase();
			if (!lowerEmail.endsWith('@ipt.pt') && !lowerEmail.endsWith('@estt.pt')) {
				this.setStatus(400);
				return { message: 'Only ipt.pt and estt.pt email addresses are allowed.' };
			}
		}

		// check uniqueness
		if (username || email) {
			const queryList = [];
			if (username) queryList.push({ username });
			if (email) queryList.push({ email: email.toLowerCase() });

			const existingUser = await User.findOne({
				$or: queryList,
				_id: { $ne: id }
			});

			if (existingUser) {
				this.setStatus(409);
				return { message: 'Username or email already in use by another account.' };
			}
		}

		const updates: any = {};
		if (username) updates.username = username;
		if (email) updates.email = email.toLowerCase();
		if (roles) updates.roles = roles;
		if (requestBody.avatarIcon !== undefined) updates.avatarIcon = requestBody.avatarIcon;

		const user = await User.findByIdAndUpdate(id, updates, { new: true }).populate('roles').select('-password');

		if (!user) {
			this.setStatus(404);
			return { message: 'User not found' };
		}

		return user as unknown as UserResponse;
	}

	/**
	 * Delete a user by ID — soft delete (admin only)
	 */
	@Delete('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden – admin role required')
	@Response('404', 'User not found')
	public async deleteUser(@Request() req: express.Request, @Path() id: string): Promise<{ message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const result = await User.findByIdAndUpdate(id, { softDelete: true });
		if (!result) {
			this.setStatus(404);
			return { message: 'User not found' };
		}
		return { message: 'User deleted successfully' };
	}
}
