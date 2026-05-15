import { Controller, Get, Post, Put, Delete, Route, Body, Path, Tags, Response } from 'tsoa';
// @ts-ignore
import User from '../models/User.js';

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
	 * list existing users
	 */
	@Get()
	public async getUsers(): Promise<UserResponse[]> {
		const users = await User.find({ $or: [{ softDelete: false }, { softDelete: { $exists: false } }] }).populate('roles').select('-password');
		return users as unknown as UserResponse[];
	}

	/**
	 * create a new user (admin context).
	 */
	@Post()
	@Response('409', 'User already exists')
	@Response('400', 'Missing parameters')
	public async addUser(@Body() requestBody: UserCreationParams): Promise<UserResponse | { message: string; }> {
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
	 * Update user details
	 */
	@Put('{id}')
	@Response('404', 'User not found')
	@Response('409', 'Username or email already in use')
	public async updateUser(@Path() id: string, @Body() requestBody: UserUpdateParams): Promise<UserResponse | { message: string; }> {
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
	 * Delete a user by ID (soft delete)
	 */
	@Delete('{id}')
	@Response('404', 'User not found')
	public async deleteUser(@Path() id: string): Promise<{ message: string; }> {
		const result = await User.findByIdAndUpdate(id, { softDelete: true });
		if (!result) {
			this.setStatus(404);
			return { message: 'User not found' };
		}
		return { message: 'User deleted successfully' };
	}
}
