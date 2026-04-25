import mongoose from 'mongoose';

/**
 * ApprovalEvent.js
 *
 * Append-only audit log. One document is written per user action
 * (approve, deny, forward) on a FormSubmission.
 *
 * DESIGN INTENT
 * ─────────────
 * Answers the admin user story:
 *   "As an admin, I want to see the complete history of changes to a
 *    form approval cycle — who intervened, when, what the lifecycle
 *    state was, and what stage the document is now at."
 *
 * Query to produce that full history:
 *   ApprovalEvent.find({ submissionId }).sort({ createdAt: 1 })
 *
 * Every document is self-contained: actorName and nodeLabel are
 * snapshotted strings so the audit trail stays readable even if
 * the user is later renamed/deleted or the template is changed.
 *
 * APPEND-ONLY CONTRACT
 * ────────────────────
 * These documents must NEVER be updated or deleted by application code.
 * If you need to correct an event, write a compensating event instead.
 *
 * TTL NOTE
 * ────────
 * A TTL index is defined below but disabled (expireAfterSeconds: 0).
 * To enable auto-expiry (e.g. 2 years = 63_072_000 s), coordinate with
 * your data-retention policy and update the value before going to prod.
 */

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

// ForwardedTo — populated only when action === 'forwarded'
const ForwardedToSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
		userName: { type: String, default: null }, // snapshot — immune to renames
		roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
		roleName: { type: String, default: null }, // snapshot
	},
	{ _id: false },
);

// Snapshot of assignedTo immediately BEFORE this event fired.
// Lets the audit UI show "was assigned to [X] → forwarded to [Y]".
const AssignedToSnapshotSchema = new mongoose.Schema(
	{
		roleIds: [{ type: mongoose.Schema.Types.ObjectId }], // no ref — snapshot only
		userIds: [{ type: mongoose.Schema.Types.ObjectId }],
	},
	{ _id: false },
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const ApprovalEventSchema = new mongoose.Schema(
	{
		// Which submission this event belongs to
		submissionId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'FormSubmission',
			required: true,
			index: true,    // primary access: find all events for a submission
		},

		// Where in the flow the action was taken
		nodeId: {
			type: String,
			required: true,
		},
		// Human-readable snapshot of the node label at action time
		nodeLabel: {
			type: String,
			required: true,
		},

		// Who acted
		actorId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		// Snapshot of the actor's display name at action time
		actorName: {
			type: String,
			required: true,
		},
		// Snapshot of the actor's role id at action time.
		// Used by isNodeSatisfied() for approvalMode === 'all' to check
		// which roles have been "covered" by approvals so far.
		actorRoleId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Role',
			default: null,
		},

		// The action taken: 'approved' | 'denied' | 'forwarded'
		action: {
			type: String,
			enum: ['approved', 'denied', 'forwarded'],
			required: true,
		},

		// Populated only when action === 'forwarded'; null otherwise
		forwardedTo: {
			type: ForwardedToSchema,
			default: null,
		},

		// Snapshot of who was assigned before this event
		previousAssignedTo: {
			type: AssignedToSnapshotSchema,
			required: true,
		},

		// The node the flow moved to AFTER this event.
		// null if:  action === 'forwarded'  (node stays the same)
		//       OR  node condition not yet satisfied (e.g. approval 1 of 2)
		// "Did the flow actually advance?" = (nextNodeId !== null)
		nextNodeId: {
			type: String,
			default: null,
		},
		// Human-readable snapshot of nextNodeId's label; null when nextNodeId is null
		nextNodeLabel: {
			type: String,
			default: null,
		},

		// Optional free-text comment from the actor (shown in audit trail)
		note: {
			type: String,
			default: null,
			maxlength: 1000,
		},
	},
	{
		// Only createdAt — no updatedAt. Append-only collection.
		timestamps: { createdAt: true, updatedAt: false },
	},
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary audit trail query: find all events for a submission in chronological order
ApprovalEventSchema.index({ submissionId: 1, createdAt: 1 });

// "What has this user approved/denied across all submissions?" (admin activity view)
ApprovalEventSchema.index({ actorId: 1, createdAt: -1 });

// TTL index — disabled (expireAfterSeconds: 0 = no expiry).
// Change the value to enable auto-expiry. Requires a replica set in prod.
ApprovalEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 0 });

// ─── Model ────────────────────────────────────────────────────────────────────

const ApprovalEvent = mongoose.model('ApprovalEvent', ApprovalEventSchema);

export default ApprovalEvent;
