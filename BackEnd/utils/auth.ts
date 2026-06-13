import express from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extract user ID from JWT token in the Authorization header.
 */
export function extractUserIdFromRequest(req: express.Request): string | null {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	const token = authHeader.split(' ')[1];
	try {
		const jwtSecret = process.env.JWT_SECRET as string;
		const decoded: any = jwt.verify(token, jwtSecret);
		return decoded.id;
	} catch {
		return null;
	}
}
