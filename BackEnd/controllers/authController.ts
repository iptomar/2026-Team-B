import { Controller, Post, Route, Body, Tags, Response } from 'tsoa';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import LoginAttempt from '../models/LoginAttempt.js';
// @ts-ignore
import RefreshToken from '../models/RefreshToken.js';
// @ts-ignore
import Role from '../models/Role.js';

// @ts-ignore
import RecoveryToken from '../models/RecoveryToken.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const InvalidCredentialsString = 'Invalid credentials';
const InvalidOrExpiredRefreshTokenString = 'Invalid or expired refresh token';

/**
 * helper function that converts a string representing a duration in days to a date object of the refresh token expiration date
 * @param expiresIn the duration in days to convert
 * @returns a date object representing the expiration date
 */
const getRefreshExpiresAt = (rememberMe: boolean = true): Date => {
	if (!rememberMe) {
		// If not remembered, token expires in 24 hours
		return new Date(Date.now() + 24 * 60 * 60 * 1000);
	}
	const expiresIn = process.env.JWT_REFRESH_SECRET_EXPIRES as string || '7d';
	const days = parseInt(expiresIn.replace(/d/i, ''), 10) || 7;
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export interface LoginParams {
	identifier: string;
	password: string;
	rememberMe?: boolean;
}

export interface RegisterParams {
	username: string;
	password: string;
	roleIds?: string[];
	email: string;
}

export interface RefreshParams {
	refreshToken: string;
}

export interface ForgotPasswordParams {
	email: string;
}

export interface ResetPasswordParams {
	token: string;
	newPassword: string;
}

export interface AuthResponse {
	accessToken: string;
	refreshToken: string;
	user: {
		id: string;
		email?: string;
		username?: string;
		roles?: any[];
		avatarIcon?: string;
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
	private async generateAuthResponse(user: any, rememberMe: boolean = true): Promise<AuthResponse> {
		const jwtSecret = process.env.JWT_SECRET as string;
		const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as string;
		const jwtSecretExpires = process.env.JWT_SECRET_EXPIRES as any;
		const jwtRefreshSecretExpires = process.env.JWT_REFRESH_SECRET_EXPIRES as any;

		const accessToken = jwt.sign(
			{
				id: user._id,
				roles: user.roles,
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
			expiresAt: getRefreshExpiresAt(rememberMe)
		});

		return {
			accessToken,
			refreshToken: refreshTokenPayload,
			user: {
				id: user._id,
				roles: user.roles,
				email: user.email,
				username: user.username,
				avatarIcon: user.avatarIcon
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
		const { username, password, roleIds, email } = requestBody;

		if (!password || !email || !username) {
			this.setStatus(400);
			return { message: 'Password and email are required' };
		}

		if (!email.toLowerCase().endsWith('@ipt.pt')) {
			this.setStatus(400);
			return { message: 'Only ipt.pt email addresses are allowed to register.' };
		}

		let assignedRoleIds = roleIds;
		if (!assignedRoleIds || assignedRoleIds.length === 0) {
			this.setStatus(400);
			return { message: 'Roles not provided' };
		}

		// Check if username or email already exists
		const existingUser = await User.findOne({
			$or: [{ username: username }, { email: email.toLowerCase() }]
		});

		if (existingUser) {
			this.setStatus(409);
			return { message: 'Username or email unavailable' };
		}

		const newUser = new User({
			username: username,
			password: password, // mongoose schema pre-save hook will hash the password before persisting the document
			roles: assignedRoleIds,
			email: email.toLowerCase(),
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
		const { identifier, password, rememberMe = false } = requestBody;

		// ensure presence of env vars
		const blockWindowMinutes = Number(process.env.FAILED_LOGIN_BLOCK_WINDOW_MINUTES);
		const maxAttempts = Number(process.env.FAILED_LOGIN_MAX_ATTEMPTS);

		if (isNaN(blockWindowMinutes) || isNaN(maxAttempts)) {
			throw new Error('Missing or invalid FAILED_LOGIN_BLOCK_WINDOW_MINUTES / FAILED_LOGIN_MAX_ATTEMPTS env vars');
		}

		// 1. check brute force login attack protection
		const blockTime = new Date(Date.now() - blockWindowMinutes * 60 * 1000);
		const failedAttempts = await LoginAttempt.countDocuments({
			identifier,
			successful: false,
			createdAt: { $gte: blockTime }
		});

		if (failedAttempts >= maxAttempts) {
			this.setStatus(429);
			return { message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' };
		}

		// 2. fetch user by username or email
		const user = await User.findOne({
			$or: [{ username: identifier }, { email: identifier }]
		}).populate('roles');

		if (!user) {
			// log failed attempt for non-existent user to prevent enumeration attacks
			// we'll not distinguish a failed login attempt for non-existent user and wrong password
			LoginAttempt.create({ identifier, successful: false }).catch(console.error);
			this.setStatus(401);
			return { message: InvalidCredentialsString };
		}

		// 3. verify password
		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			LoginAttempt.create({ identifier: identifier, successful: false }).catch(console.error);
			this.setStatus(401);
			return { message: InvalidCredentialsString };
		}

		// 4. log successful attempt
		LoginAttempt.create({ identifier, successful: true }).catch(console.error);

		// 5. generate and return tokens using consolidated method
		return await this.generateAuthResponse(user, rememberMe);
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

			const user = await User.findById(decoded.id).populate('roles');
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

	/**
	 * executa o fluxo de recuperação de password gerando um token forte
	 */
	@Post('forgot-password')
	@Response('200', 'Sempre devolve sucesso para mitigar enumeration attacks.')
	public async forgotPassword(@Body() requestBody: ForgotPasswordParams): Promise<{ message: string; debugToken?: string; }> {
		const { email } = requestBody;

		if (!email) {
			this.setStatus(400);
			return { message: 'Email missing' };
		}

		if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
			this.setStatus(400);
			return { message: 'Email format is invalid' };
		}

		const genericMessage = 'Se o e-mail existir, receberá instruções para recuperar a password.';

		const user = await User.findOne({
			$or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }]
		});

		if (!user) {
			return { message: genericMessage };
		}

		const resetToken = crypto.randomBytes(32).toString('hex');
		const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
		const expireDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hr

		await RecoveryToken.deleteMany({ userId: user._id });

		await RecoveryToken.create({
			token: hashedToken,
			userId: user._id,
			expiresAt: expireDate
		});

		// fire and forget the email sending process
		sendPasswordResetEmail(user.email, resetToken).catch(console.error);

		if (process.env.NODE_ENV === 'development') {
			return { message: genericMessage, debugToken: resetToken };
		}

		return { message: genericMessage };
	}

	/**
	 * resets the password using a valid recovery token
	 */
	@Post('reset-password')
	@Response('400', 'Invalid or expired token')
	@Response('200', 'Password successfully reset')
	public async resetPassword(@Body() requestBody: ResetPasswordParams): Promise<{ message: string; }> {
		const { token, newPassword } = requestBody;

		if (!token || !newPassword) {
			this.setStatus(400);
			return { message: 'Token and new password are required' };
		}

		const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

		const recoveryTokenObj = await RecoveryToken.findOne({ token: hashedToken });

		if (!recoveryTokenObj) {
			this.setStatus(400);
			return { message: 'Invalid or expired token' };
		}

		if (recoveryTokenObj.expiresAt < new Date()) {
			await RecoveryToken.findByIdAndDelete(recoveryTokenObj._id);
			this.setStatus(400);
			return { message: 'Invalid or expired token' };
		}

		const user = await User.findById(recoveryTokenObj.userId);
		if (!user) {
			this.setStatus(400); // the user was deleted but token remained
			return { message: 'Invalid or expired token' };
		}

		user.password = newPassword; // mongoose pre-save hook handles hashing
		await user.save();

		await RecoveryToken.findByIdAndDelete(recoveryTokenObj._id);

		return { message: 'Password has been successfully reset' };
	}
}
