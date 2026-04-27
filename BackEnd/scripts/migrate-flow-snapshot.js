/**
 * migrate-flow-snapshot.js
 *
 * One-time migration script.
 *
 * WHAT IT DOES
 * ────────────
 * For every FormSubmission where flowSnapshot is null (i.e. pre-engine docs):
 *   1. Parses the 'flow' key out of the submittedData JSON string
 *   2. Writes it into the new flowSnapshot field (Mixed)
 *   3. Finds the start node and writes its id into currentNodeId
 *   4. Resolves the initial assignees from the start node's allowedSubmitRoles
 *      and writes them into assignedTo (so the pending dashboard works)
 *
 * HOW TO RUN
 * ──────────
 *   node scripts/migrate-flow-snapshot.js
 *
 * Safe to run multiple times — it only touches documents where
 * flowSnapshot IS NULL, so already-migrated docs are skipped.
 *
 * WHAT IT DOES NOT DO
 * ───────────────────
 * It does not change submittedData — the field is left intact.
 * It does not change status — existing 'submitted' docs stay 'submitted'.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

// ── Inline minimal schemas — avoids circular imports and keeps the script ──
// standalone. We only select the fields we need.
const UserSchema = new mongoose.Schema({ role: mongoose.Schema.Types.ObjectId });
const User = mongoose.model('User', UserSchema);

const SubmissionSchema = new mongoose.Schema(
	{
		submittedData: String,
		flowSnapshot: mongoose.Schema.Types.Mixed,
		currentNodeId: String,
		assignedTo: {
			roleIds: [mongoose.Schema.Types.ObjectId],
			userIds: [mongoose.Schema.Types.ObjectId],
		},
		status: String,
		submitterId: mongoose.Schema.Types.ObjectId,
	},
	{ timestamps: true, strict: false }, // strict:false so we can save new fields
);
const FormSubmission = mongoose.model('FormSubmission', SubmissionSchema);

async function resolveUsersForRoles(roleIds) {
	if (!roleIds || roleIds.length === 0) return [];
	// User.role is singular — query with $in
	const users = await User.find({ role: { $in: roleIds } }).select('_id').lean();
	return users.map(u => u._id);
}

async function run() {
	await connectDB();
	console.log('Connected to MongoDB');

	// Find all submissions that have not been migrated yet
	const docs = await FormSubmission.find({ flowSnapshot: null }).lean();
	console.log(`Found ${docs.length} submission(s) to migrate`);

	let migrated = 0;
	let skipped = 0;
	let errors = 0;

	for (const doc of docs) {
		try {
			let parsed;
			try {
				parsed = JSON.parse(doc.submittedData);
			} catch (e) {
				console.warn(`  SKIP ${doc._id}: submittedData is not valid JSON`);
				skipped++;
				continue;
			}

			const flow = parsed.flow;
			if (!flow || !flow.nodes || !flow.edges) {
				console.warn(`  SKIP ${doc._id}: no "flow" key found in submittedData`);
				skipped++;
				continue;
			}

			// Find the start node
			const startNode = flow.nodes.find(n => n.type === 'start');
			if (!startNode) {
				console.warn(`  SKIP ${doc._id}: no start node found in flow`);
				skipped++;
				continue;
			}

			// Resolve initial assignees from the first approval node after start
			// (or fall back to the start node's allowedSubmitRoles)
			const startEdges = flow.edges.filter(e => e.source === startNode.id);
			const firstApprovalNode = flow.nodes.find(
				n => startEdges.some(e => e.target === n.id) && n.type === 'approval',
			);

			let roleIds = [];
			let userIds = [];

			if (firstApprovalNode) {
				roleIds = (firstApprovalNode.data?.assignedRoles ?? []).map(
					id => new mongoose.Types.ObjectId(id),
				);
				const specificUserIds = (firstApprovalNode.data?.specificUsers ?? []).map(
					id => new mongoose.Types.ObjectId(id),
				);
				const usersFromRoles = await resolveUsersForRoles(roleIds);
				// Merge and deduplicate
				const allIds = [...usersFromRoles];
				for (const sid of specificUserIds) {
					if (!allIds.some(id => id.toString() === sid.toString())) allIds.push(sid);
				}
				userIds = allIds;
			}

			await FormSubmission.updateOne(
				{ _id: doc._id },
				{
					$set: {
						flowSnapshot: flow,
						currentNodeId: firstApprovalNode ? firstApprovalNode.id : startNode.id,
						assignedTo: { roleIds, userIds },
					},
				},
			);

			console.log(
				`  OK  ${doc._id} → currentNodeId: ${firstApprovalNode?.id ?? startNode.id}` +
				` | assignedTo: ${userIds.length} user(s)`,
			);
			migrated++;
		} catch (err) {
			console.error(`  ERR ${doc._id}:`, err.message);
			errors++;
		}
	}

	console.log(`\nDone. Migrated: ${migrated} | Skipped: ${skipped} | Errors: ${errors}`);
	await mongoose.disconnect();
}

run().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
