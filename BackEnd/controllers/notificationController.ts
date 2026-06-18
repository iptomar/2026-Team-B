import { Controller, Get, Put, Route, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import { extractUserIdFromRequest } from '../utils/auth.js';
// @ts-ignore
import Notification from '../models/Notification.js';

export interface NotificationResponse {
	_id: string;
	userId: string;
	submissionId: string;
	type: string;
	message: string;
	read: boolean;
	createdAt: string;
}

@Route('notifications')
@Tags('Notifications')
export class NotificationController extends Controller {

	/**
	 * Get all notifications for the authenticated user
	 */
	@Get()
	@Response('401', 'Unauthorized')
	public async getNotifications(
		@Request() req: express.Request
	): Promise<NotificationResponse[] | { message: string }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const notifications = await Notification.find({ userId })
			.sort({ createdAt: -1 })
			.lean();

		return (notifications as any[]).map(n => ({
			_id: n._id.toString(),
			userId: n.userId.toString(),
			submissionId: n.submissionId.toString(),
			type: n.type,
			message: n.message,
			read: n.read,
			createdAt: n.createdAt?.toISOString?.() ?? n.createdAt
		}));
	}

	/**
	 * Get the unread notification count
	 */
	@Get('unread')
	@Response('401', 'Unauthorized')
	public async getUnreadCount(
		@Request() req: express.Request
	): Promise<{ count: number } | { message: string }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const count = await Notification.countDocuments({ userId, read: false });
		return { count };
	}

	/**
	 * Mark a specific notification as read
	 */
	@Put('{id}/read')
	@Response('401', 'Unauthorized')
	@Response('404', 'Notification not found')
	public async markAsRead(
		@Path() id: string,
		@Request() req: express.Request
	): Promise<{ message: string }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const notification = await Notification.findOneAndUpdate(
			{ _id: id, userId },
			{ read: true },
			{ new: true }
		);

		if (!notification) {
			this.setStatus(404);
			return { message: 'Notification not found' };
		}

		return { message: 'Marked as read' };
	}

	/**
	 * Mark all notifications as read
	 */
	@Put('read-all')
	@Response('401', 'Unauthorized')
	public async markAllAsRead(
		@Request() req: express.Request
	): Promise<{ message: string }> {
		const userId = extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		await Notification.deleteMany({ userId });

		return { message: 'All notifications marked as read' };
	}
}
