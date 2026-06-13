import mongoose from 'mongoose';

// ─── Sub-schema: AssignedTo ───────────────────────────────────────────────────
// Tracks who is responsible for acting on the submission at this moment.
// roleIds  → for display ("waiting on: staff, manager")
// userIds  → for validateActor() and notification dispatch
const AssignedToSchema = new mongoose.Schema(
	{
		roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
		userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	},
	{ _id: false },
);

// ─── Sub-schema: Attachment ───────────────────────────────────────────────────
// References to files stored in Azure Blob Storage.
// Only metadata is persisted here — actual bytes live in the blob container.
const AttachmentSchema = new mongoose.Schema(
	{
		fieldId: { type: String, required: true },                          // which form field this file belongs to
		originalName: { type: String, required: true },                    // user-facing filename
		blobName: { type: String, required: true },                        // unique blob path in Azure storage
		containerName: { type: String, required: true },                   // Azure container name
		contentType: { type: String, default: 'application/octet-stream' },
		size: { type: Number, default: 0 },                                // bytes
	},
	{ _id: false },
);

// ─── Status values ────────────────────────────────────────────────────────────
// submitted   → just created, engine has not run yet
// in_progress → engine has advanced at least once; waiting on an approval node
// approved    → reached an end node with outcome "approved"
// denied      → reached an end node with outcome "denied"
export const SUBMISSION_STATUSES = ['submitted', 'in_progress', 'approved', 'denied'];

// ─── Main schema ─────────────────────────────────────────────────────────────
const FormSubmissionSchema = new mongoose.Schema(
	{
		// ── Template reference ──────────────────────────────────────────────
		templateId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'FormTemplate',
			required: true,
			index: true,          // template-based lookups, admin overview
		},

		// ── Who submitted ───────────────────────────────────────────────────
		submitterId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,          // "my submissions" dashboard query
		},

		// ── Form content (frozen snapshots — never mutated after creation) ──
		//
		// submittedValues: dictionary mapping fieldId to the submitted primitive values.
		submittedValues: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},

		// flowSnapshot: the { nodes[], edges[] } object from the flow editor,
		//   frozen at submission time. Stored as a plain object (Mixed) so the
		//   engine can read nodes/edges without JSON.parse on every action.
		//   Defaults to null for backward compat — migration script backfills it.
		flowSnapshot: {
			type: mongoose.Schema.Types.Mixed,
			default: null,
		},

		// ── Current flow position (mutated only by the flow engine) ────────
		//
		// currentNodeId: the id of the node this instance is currently at.
		//   Matches a node id inside flowSnapshot.nodes.
		//   Set to the start node's id by the engine on first run.
		currentNodeId: {
			type: String,
			default: null,
		},

		// assignedTo: resolved list of who can act right now.
		//   Updated by the engine after every advance() or handleForward().
		//   roleIds used for display; userIds used for validation + notification.
		assignedTo: {
			type: AssignedToSchema,
			default: () => ({ roleIds: [], userIds: [] }),
		},

		// ── Lifecycle state ─────────────────────────────────────────────────
		status: {
			type: String,
			enum: SUBMISSION_STATUSES,
			default: 'submitted',
			index: true,          // admin filters, pending-approvals query
		},

		// completedAt: set by the engine when an end node is reached.
		completedAt: {
			type: Date,
			default: null,
		},

		// ── File attachments (Azure Blob Storage references) ────────────────
		// Each entry maps a file field in the form to a blob in Azure.
		// Defaults to [] for backward compat with pre-upload submissions.
		attachments: {
			type: [AttachmentSchema],
			default: [],
		},
	},
	{ timestamps: true },
);

// ─── Compound indexes ─────────────────────────────────────────────────────────

// "Show me all submissions I need to act on"
// Dashboard pending-approvals: find in_progress docs where the current
// user appears in assignedTo.userIds. Pure index scan with this compound.
FormSubmissionSchema.index({ 'assignedTo.userIds': 1, status: 1 });

// "Show me my submitted forms, newest first"
FormSubmissionSchema.index({ submitterId: 1, createdAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

export default FormSubmission;


