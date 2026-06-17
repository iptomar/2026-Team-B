import { Controller, Get, Post, Put, Delete, Route, Body, Path, Tags, Response, Request, UploadedFile } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
import { StorageProvider } from '../services/storage/StorageProvider.js';
import crypto from 'crypto';
import path from 'path';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import Role from '../models/Role.js';

export interface UserCreationParams {
	username: string;
	email: string;
	password?: string; // Optional for edit, required for create, though create enforces manually below.
	roles: string[];
	units?: string[];
}

export interface UserUpdateParams {
	username?: string;
	email?: string;
	roles?: string[];
	units?: string[];
	avatarIcon?: string;
}

export interface UserResponse {
	_id: string;
	username: string;
	email: string;
	roles: any[];
	units?: any[];
	avatarIcon?: string;
	failedAttempts?: number;
	lockedUntil?: Date;
}

@Route('users')
@Tags('Users')
export class UserController extends Controller {

	// Removed duplicate extractUserIdFromRequest

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
	 * list existing users (admin only)
	 */
	@Get()
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden - admin role required')
	public async getUsers(@Request() req: express.Request): Promise<UserResponse[] | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const users = await User.find({ $or: [{ softDelete: false }, { softDelete: { $exists: false } }] }).populate('roles', 'name').populate('units', 'name').select('-password').lean();
		return users as unknown as UserResponse[];
	}

	/**
	 * create a new user (admin only).
	 */
	@Post()
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden - admin role required')
	@Response('409', 'User already exists')
	@Response('400', 'Missing parameters')
	public async addUser(@Request() req: express.Request, @Body() requestBody: UserCreationParams): Promise<UserResponse | { message: string; }> {
		const adminId = await this.requireAdmin(req);
		if (!adminId) return { message: 'Admin access required' };

		const { username, email, password, roles, units } = requestBody;

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
				roles,
				units: units || []
			});
			await user.save();

			// Exclude password from the returned object by querying the just saved user
			const savedUser = await User.findById(user._id).populate('roles').populate('units').select('-password');
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
	@Response('403', 'Forbidden - admin role required or modifying other user')
	@Response('404', 'User not found')
	@Response('409', 'Username or email already in use')
	public async updateUser(@Request() req: express.Request, @Path() id: string, @Body() requestBody: UserUpdateParams): Promise<UserResponse | { message: string; }> {
		const currentUserId = extractUserIdFromRequest(req);
		if (!currentUserId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}
		const admin = await this.isAdmin(currentUserId);
		if (!admin && currentUserId !== id) {
			this.setStatus(403);
			return { message: 'Forbidden - you can only update your own profile' };
		}

		const { username, email, roles, units } = requestBody;

		if ((roles || units) && !admin) {
			this.setStatus(403);
			return { message: 'Forbidden - only admins can update roles and units' };
		}

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
		if (units) updates.units = units;
		if (requestBody.avatarIcon !== undefined) updates.avatarIcon = requestBody.avatarIcon;

		const user = await User.findByIdAndUpdate(id, updates, { new: true }).populate('roles').populate('units').select('-password');

		if (!user) {
			this.setStatus(404);
			return { message: 'User not found' };
		}

		// Check if we need to return a SAS URL instead of the raw blob name
		if (user.avatarIcon && user.avatarIcon.startsWith('avatars/')) {
			try {
				const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
				const storageService = StorageProvider.getInstance();
				const avatarUrl = storageService.generateSasUrl(containerName, user.avatarIcon, 24); // 24 hours validity just for display here
				user.avatarIcon = avatarUrl;
			} catch (e) {
				console.error('Failed to generate SAS token for updated user', e);
			}
		}

		return user as unknown as UserResponse;
	}

	/**
	 * Upload an avatar image for a user to Azure Blob Storage
	 */
	@Post('{id}/avatar')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden')
	@Response('404', 'User not found')
	@Response('400', 'No file provided')
	public async uploadAvatar(
		@Request() req: express.Request,
		@Path() id: string,
		@UploadedFile() avatar?: Express.Multer.File
	): Promise<UserResponse | { message: string; }> {
		const currentUserId = extractUserIdFromRequest(req);
		if (!currentUserId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const admin = await this.isAdmin(currentUserId);
		if (!admin && currentUserId !== id) {
			this.setStatus(403);
			return { message: 'Forbidden - you can only update your own profile' };
		}

		if (!avatar) {
			this.setStatus(400);
			return { message: 'No file provided' };
		}

		const user = await User.findById(id).populate('roles').populate('units').select('-password');
		if (!user) {
			this.setStatus(404);
			return { message: 'User not found' };
		}

		try {
			const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
			const ext = path.extname(avatar.originalname);
			const blobName = `avatars/${id}/${crypto.randomUUID()}${ext}`;

			const storageService = StorageProvider.getInstance();
			await storageService.uploadBlob(containerName, blobName, avatar.buffer, avatar.mimetype);

			user.avatarIcon = blobName;
			await user.save();

			// Replace with SAS token for immediate frontend use
			const userObj = user.toObject();
			const avatarUrl = storageService.generateSasUrl(containerName, blobName, 24);
			userObj.avatarIcon = avatarUrl;

			return userObj as unknown as UserResponse;
		} catch (error: any) {
			console.error(error);
			this.setStatus(500);
			return { message: 'Internal Server Error' };
		}
	}

	/**
	 * Retrieve a SAS URL for a user's avatar.
	 * This endpoint enables lazy loading of user avatars.
	 */
	@Get('{id}/avatar/sas')
	@Response('404', 'User not found or has no blob avatar')
	@Response('500', 'Internal Server Error')
	public async getUserAvatarSas(@Path() id: string): Promise<{ url: string; } | { message: string; }> {
		try {
			const user = await User.findById(id).select('avatarIcon').lean();
			if (!user || !user.avatarIcon || !user.avatarIcon.startsWith('avatars/')) {
				this.setStatus(404);
				return { message: 'User not found or has no blob avatar' };
			}

			const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
			const storageService = StorageProvider.getInstance();
			const url = storageService.generateSasUrl(containerName, user.avatarIcon, 24 * 60); // 24 hours

			return { url };
		} catch (error: any) {
			console.error(error);
			this.setStatus(500);
			return { message: 'Internal Server Error' };
		}
	}

	/**
	 * Delete a user's avatar image for moderation purposes.
	 * Requires admin role, or the user deleting their own.
	 */
	@Delete('{id}/avatar')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden')
	@Response('404', 'User not found or no avatar to delete')
	@Response('500', 'Internal Server Error')
	public async deleteUserAvatar(@Request() req: express.Request, @Path() id: string): Promise<{ message: string; }> {
		const currentUserId = extractUserIdFromRequest(req);
		if (!currentUserId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const admin = await this.isAdmin(currentUserId);
		if (!admin && currentUserId !== id) {
			this.setStatus(403);
			return { message: 'Forbidden - you can only update your own profile' };
		}

		try {
			const user = await User.findById(id).select('avatarIcon');
			if (!user) {
				this.setStatus(404);
				return { message: 'User not found' };
			}

			// If it is a blob, delete it from Azure
			if (user.avatarIcon && user.avatarIcon.startsWith('avatars/')) {
				const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';
				const storageService = StorageProvider.getInstance();
				await storageService.deleteBlob(containerName, user.avatarIcon).catch(e => {
					console.error('Failed to delete blob from Azure Storage:', e);
				});
			}

			// Reset the user's avatar to the default emoji
			user.avatarIcon = '👤';
			await user.save();

			return { message: 'Avatar deleted successfully' };
		} catch (error: any) {
			console.error(error);
			this.setStatus(500);
			return { message: 'Internal Server Error' };
		}
	}

	/**
	 * Delete a user by ID — soft delete (admin only)
	 */
	@Delete('{id}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden - admin role required')
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
