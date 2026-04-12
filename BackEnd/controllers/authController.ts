import { Controller, Post, Route, Body, Tags, Response } from 'tsoa';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import LoginAttempt from '../models/LoginAttempt.js';
// @ts-ignore
import RefreshToken from '../models/RefreshToken.js';
// @ts-ignore
import Role from '../models/Role.js';

const InvalidCredentialsString = 'Invalid credentials';
const InvalidOrExpiredRefreshTokenString = 'Invalid or expired refresh token';

const getRefreshExpiresAt = (): Date => {
	const expiresIn = process.env.JWT_REFRESH_SECRET_EXPIRES as string || '7d';
	const days = parseInt(expiresIn.replace(/d/i, ''), 10) || 7;
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export interface LoginParams {
	identifier: string;
	password: string;
}

export interface RegisterParams {
	username: string;
	password: string;
	roleId?: string;
	email: string;
}

export interface RefreshParams {
	refreshToken: string;
}

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: {
		id: string;
		email?: string;
		username?: string;
		role?: any;
	};
}

@Route('auth')
@Tags('Authentication')
export class AuthController extends Controller {
	
	/**
	 * stateless function to generate an access token and refresh token for a given user
	 * doesn't check if the user is valid or not
	 * doesn't preform refresh token rotation
	 * @param user the user to generate tokens for
	 * @returns an object containing the access token, refresh token, and user information
	 */
	private async generateAuthResponse(user: any): Promise<AuthResponse> {
		const jwtSecret = process.env.JWT_SECRET as string;
		const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as string;
		const jwtSecretExpires = process.env.JWT_SECRET_EXPIRES as any;
		const jwtRefreshSecretExpires = process.env.JWT_REFRESH_SECRET_EXPIRES as any;

		const accessToken = jwt.sign(
			{ 
				id: user._id, 
				role: user.role, 
				email: user.email, 
				username: user.username 
			},
			jwtSecret,
			{ expiresIn: jwtSecretExpires }
		);

		const refreshTokenPayload = jwt.sign(
			{ id: user._id },
			jwtRefreshSecret,
			{ expiresIn: jwtRefreshSecretExpires }
		);

		await RefreshToken.create({
			token: refreshTokenPayload,
			userId: user._id,
			expiresAt: getRefreshExpiresAt()
		});

		return {
			accessToken,
			refreshToken: refreshTokenPayload,
			user: { 
				id: user._id, 
				role: user.role, 
				email: user.email, 
				username: user.username 
			}
		};
	}

	/**
	 * register a new user account.
	 */
	@Post('register')
	@Response('400', 'Missing parameters or role not found')
	@Response('409', 'User already exists')
	public async register(@Body() requestBody: RegisterParams): Promise<AuthResponse | { message: string; }> {
		const { username, password, roleId, email } = requestBody;

		if (!password || !email || !username) {
			this.setStatus(400);
			return { message: 'Password and email are required' };
		}

		let assignedRoleId = roleId;
		if (!assignedRoleId) {
			this.setStatus(400);
			return { message: 'Role not provided' };
		}

		const newUser = new User({ 
			username: username,
			password: password, // mongoose schema pre-save hook will hash the password before persisting the document
			role: assignedRoleId,
			email: email,
		});

		await newUser.save();

		return await this.generateAuthResponse(newUser);
	}

	/**
	 * login with ID and password, returns an access token and refresh token upon success.
	 * enforces brute force protection based on failed login attempts.
	 */
	@Post('login')
	@Response('401', 'Invalid credentials')
	@Response('429', 'Too many failed attempts. Please try again later.')
	public async login(@Body() requestBody: LoginParams): Promise<AuthResponse | { message: string; }> {
		const { identifier, password } = requestBody;

		// 1. check brute force login attack protection
		const blockTime = new Date(Date.now() - Number(process.env.FAILED_LOGIN_BLOCK_WINDOW_MINUTES) * 60 * 1000);
		const failedAttempts = await LoginAttempt.countDocuments({
			identifier: identifier,
			successful: false,
			createdAt: { $gte: blockTime }
		});

		if (failedAttempts >= Number(process.env.FAILED_LOGIN_MAX_ATTEMPTS)) {
			this.setStatus(429);
			return { message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' };
		}

		// 2. fetch user by username or email
		const user = await User.findOne({
			$or: [{ username: identifier }, { email: identifier }]
		}).populate('role');

		if (!user) {
			// log failed attempt for non-existent user to prevent enumeration attacks
			// we'll not distinguish a failed login attempt for non-existent user and wrong password
			await LoginAttempt.create({ identifier: identifier, successful: false });
			this.setStatus(401);
			return { message: InvalidCredentialsString };
		}

		// 3. verify password
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			await LoginAttempt.create({ identifier: identifier, successful: false });
			this.setStatus(401);
			return { message: InvalidCredentialsString };
		}

		// 4. log successful attempt
		await LoginAttempt.create({ identifier: identifier, successful: true });

		// 5. generate and return tokens using consolidated method
		return await this.generateAuthResponse(user);
	}

	/**
	 * refreshes the access token using a valid, non-expired refresh token.
	 */
	@Post('refresh')
	@Response('401', 'Refresh token missing or invalid')
	public async refresh(@Body() requestBody: RefreshParams): Promise<AuthResponse | { message: string; }> {
		const { refreshToken } = requestBody;

		if (!refreshToken) {
			this.setStatus(401);
			return { message: 'Refresh token is missing' };
		}

		// 1. check if token exists in database and isn't expired
		const storedToken = await RefreshToken.findOne({ token: refreshToken });
		if (!storedToken || storedToken.expiresAt < new Date()) {
			if (storedToken) {
				await RefreshToken.findByIdAndDelete(storedToken._id); // cleanup expired
			}
			this.setStatus(401);
			return { message: InvalidOrExpiredRefreshTokenString };
		}

		try {
			// 2. verify if token is valid
			const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as string;
			const decoded: any = jwt.verify(refreshToken, jwtRefreshSecret);

			const user = await User.findById(decoded.id).populate('role');
			if (!user) {
				// if this happens, it means the token is valid but the user was recently deleted
				// and a dangling orphaned token exists in the database
				// cleanup the orphaned token since the user no longer exists
				await RefreshToken.findOneAndDelete({ token: refreshToken });

				this.setStatus(401);
				// ignore refresh token for non-existent user to prevent account state leakage
				return { message: InvalidOrExpiredRefreshTokenString };
			}

			// 3. token rotation: delete old token, generate and return new tokens
			await RefreshToken.findByIdAndDelete(storedToken._id);
			
			return await this.generateAuthResponse(user);
		} catch (error) {
			this.setStatus(401);
			return { message: 'Token verification failed' };
		}
	}

	/**
	 * logout user by invalidating the refresh token.
	 */
	@Post('logout')
	@Response('400', 'Refresh token missing')
	public async logout(@Body() requestBody: RefreshParams): Promise<{ message: string; }> {
		const { refreshToken } = requestBody;

		if (!refreshToken) {
			this.setStatus(400);
			return { message: 'Refresh token is required for logout' };
		}

		// revoke the token by deleting it from the database
		const result = await RefreshToken.findOneAndDelete({ token: refreshToken });

		if (!result) {
			// it's wasn't found, so we can still return success (token isn't present in the collection)
			return { message: 'Successfully logged out' };
		}

		return { message: 'Successfully logged out' };
	}
}
