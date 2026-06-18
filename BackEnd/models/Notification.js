import mongoose from 'mongoose';

/**
 * Notification.js
 *
 * Persisted notification for a user related to a form submission event.
 *
 * PURPOSE
 * ───────
 * The flow engine writes one document here per intended recipient after
 * every state transition. This ensures offline users receive their
 * notifications the next time they load the app.
 *
 * FUTURE DELIVERY LAYER
 * ─────────────────────
 * Real-time delivery (Socket.IO emit) and email fallback are intentionally
 * NOT wired here yet — a TODO stub exists in flowEngine.ts. When that layer
 * is added, it will read from this collection or emit alongside the write.
 *
 * API SURFACE (future)
 * ────────────────────
 *   GET  /notifications          — unread notifications for the current user
 *   PUT  /notifications/:id/read — mark as read
 */
const NotificationSchema = new mongoose.Schema(
	{
		// Who the notification is for
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,   // "my notifications" query
		},

		// The submission this notification is about
		submissionId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'FormSubmission',
			required: true,
		},

		// Type controls the icon and colour in the UI
		// 'action_required' → user needs to approve/deny
		// 'approved' / 'denied' → outcome notification to the submitter
		// 'forwarded' → the task was forwarded to you
		type: {
			type: String,
			enum: ['action_required', 'approved', 'denied', 'forwarded', 'returned', 'resubmitted'],
			required: true,
		},

		// Human-readable message shown in the notification panel
		message: {
			type: String,
			required: true,
			maxlength: 500,
		},

		// Has the user dismissed/read this notification?
		read: {
			type: Boolean,
			default: false,
			index: true,   // fast unread-count query: { userId, read: false }
		},
	},
	{ timestamps: true },
);

// Compound: "give me all unread notifications for user X, newest first"
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// TTL index: Automatically delete notifications after 7 days (604800 seconds)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
