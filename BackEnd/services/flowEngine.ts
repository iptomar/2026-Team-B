/**
 * flowEngine.ts
 *
 * The approval flow engine. Single source of truth for all state
 * transitions on a FormSubmission.
 *
 * ────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 * ────────────────────────────────────────────────────────────────
 * ONE public entry point: processAction()
 * Nothing else in the codebase should mutate:
 *   - FormSubmission.currentNodeId
 *   - FormSubmission.assignedTo
 *   - FormSubmission.status
 *
 * Internal functions are intentionally pure or near-pure — they
 * receive data, compute a result, and return it. All DB writes are
 * concentrated in processAction() so they are easy to audit.
 *
 * ────────────────────────────────────────────────────────────────
 * CALL FLOW — approve / deny
 * ────────────────────────────────────────────────────────────────
 * processAction(submissionId, actorId, "approved", opts)
 *   ├─ validateActor()          is this person allowed to act?
 *   ├─ collectNodeApprovals()   how many approvals so far on this node?
 *   ├─ isNodeSatisfied()        can we advance?
 *   │    ├─ YES → findMatchingEdge() → advance() → resolveAssignees()
 *   │    └─ NO  → record partial approval and return (still waiting)
 *   ├─ [write ApprovalEvent]    ALWAYS written, even for partial approvals
 *   ├─ [save submission]
 *   └─ notifyAssignees()
 *
 * CALL FLOW — forward
 * ────────────────────────────────────────────────────────────────
 * processAction(submissionId, actorId, "forwarded", { forwardTarget })
 *   ├─ validateActor()
 *   ├─ handleForward()          reassign, node stays the same
 *   ├─ [write ApprovalEvent]
 *   ├─ [save submission]
 *   └─ notifyAssignees()
 *
 * ────────────────────────────────────────────────────────────────
 * CODEBASE NOTES (important divergences from the generic design)
 * ────────────────────────────────────────────────────────────────
 * • User.role is SINGULAR (one ObjectId, not an array).
 *   resolveAssignees() queries { role: { $in: [...] } }.
 * • All model imports use the '.js' extension (ES module convention).
 * • No Socket.IO layer yet — notifyAssignees() writes to Mongo only.
 *   A TODO stub marks where the emit call will go.
 * • flowSnapshot is read directly from the field (Mixed).
 *   A backward-compat guard parses it from submittedData if the field
 *   is null (for docs not yet migrated by the migration script).
 */

// @ts-ignore — JS models don't have type declarations
import FormSubmission from '../models/FormSubmission.js';
// @ts-ignore
import ApprovalEvent from '../models/ApprovalEvent.js';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import Role from '../models/Role.js';
// @ts-ignore
import Notification from '../models/Notification.js';
import { Types } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A node as stored in flowSnapshot.nodes */
interface FlowNode {
	id: string;
	type: 'start' | 'approval' | 'end';
	data: {
		label: string;
		// approval nodes
		approvalMode?: 'any' | 'all';
		requiredApprovals?: number;
		denyMode?: 'any' | 'all';
		requiredDenials?: number;
		assignedRoles?: string[];   // role ObjectId strings
		specificUsers?: string[];   // user ObjectId strings
		// end nodes
		outcome?: 'approved' | 'denied';
		// start nodes
		allowedRoles?: string[];
		allowedSubmitRoles?: string[];
	};
}

/** An edge as stored in flowSnapshot.edges */
interface FlowEdge {
	id: string;
	source: string;
	target: string;
	/**
	 * If set, this edge is only followed for the matching action.
	 * null / undefined = unconditional (always follow if no exact match).
	 */
	action?: ApprovalAction | null;
	label?: string; // legacy — prefer action field
}

interface FlowSnapshot {
	nodes: FlowNode[];
	edges: FlowEdge[];
}

export type ApprovalAction = 'approved' | 'denied' | 'forwarded';

interface ForwardTarget {
	userId?: string;
	roleId?: string;
}

interface ProcessActionOptions {
	note?: string;
	forwardTarget?: ForwardTarget; // required when action === 'forwarded'
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Read the flow snapshot from the submission.
 * Backward-compat guard: if flowSnapshot is null (doc not yet migrated),
 * parse it out of submittedData. The migration script eliminates this path.
 */
function getFlowSnapshot(submission: any): FlowSnapshot {
	if (submission.flowSnapshot) {
		return submission.flowSnapshot as FlowSnapshot;
	}
	// Fallback: parse from submittedData (pre-migration docs)
	const parsed = JSON.parse(submission.submittedData);
	if (!parsed.flow) {
		throw new Error(
			`Submission ${submission._id} has no flowSnapshot field and no flow key in submittedData. ` +
			`Run the migration script: node scripts/migrate-flow-snapshot.js`,
		);
	}
	return parsed.flow as FlowSnapshot;
}

function getCurrentNode(submission: any): FlowNode {
	const flow = getFlowSnapshot(submission);
	const node = flow.nodes.find((n: FlowNode) => n.id === submission.currentNodeId);
	if (!node) {
		throw new Error(
			`Node "${submission.currentNodeId}" not found in flowSnapshot for submission ${submission._id}`,
		);
	}
	return node;
}

// ─── 1. validateActor ────────────────────────────────────────────────────────
/**
 * Checks whether the actor is in the current assignedTo list.
 * A user qualifies if their userId OR their role appears in assignedTo.
 *
 * NOTE: User.role is a single ObjectId in this schema (not an array).
 *
 * Returns actor metadata needed for the ApprovalEvent snapshot.
 * THROWS (caught by processAction → 403) if not authorised.
 */
async function validateActor(
	submission: any,
	actorId: Types.ObjectId,
): Promise<{ actorName: string; actorRoleId: Types.ObjectId | null; }> {
	const actor = await User.findById(actorId).select('username roles').lean();
	if (!actor) throw new Error('Actor not found');

	const assignedUserIds: string[] = (submission.assignedTo?.userIds ?? []).map((id: any) => id.toString());
	const assignedRoleIds: string[] = (submission.assignedTo?.roleIds ?? []).map((id: any) => id.toString());

	const actorRoleId: Types.ObjectId | null = actor.roles && actor.roles.length > 0 ? new Types.ObjectId(actor.roles[0]) : null;

	const isAssignedDirectly = assignedUserIds.includes(actorId.toString());
	const isAssignedByRole = actor.roles && actor.roles.some((r: any) => assignedRoleIds.includes(r.toString()));

	if (!isAssignedDirectly && !isAssignedByRole) {
		throw new Error('UNAUTHORISED: actor is not in the current assignedTo list');
	}

	return { actorName: actor.username, actorRoleId };
}

// ─── 2. collectNodeApprovals ─────────────────────────────────────────────────
/**
 * Returns all 'approved' ApprovalEvents for the current node.
 * Used by isNodeSatisfied() to count and check role coverage.
 * Read-only — never writes.
 */
async function collectNodeApprovals(
	submissionId: Types.ObjectId,
	nodeId: string,
): Promise<{ actorId: string; actorRoleId: string | null; }[]> {
	const events = await ApprovalEvent.find({
		submissionId,
		nodeId,
		action: 'approved',
	})
		.select('actorId actorRoleId')
		.lean();

	return events.map((e: any) => ({
		actorId: e.actorId.toString(),
		actorRoleId: e.actorRoleId ? e.actorRoleId.toString() : null,
	}));
}

// ─── 3. isNodeSatisfied ──────────────────────────────────────────────────────
/**
 * Determines whether the node's approval condition has been met.
 *
 * Mode 'any': N distinct users have approved (N = requiredApprovals, default 1).
 *   The first person to approve in the pool wins if requiredApprovals === 1.
 *
 * Mode 'all': every assigned role must have at least one representative
 *   who approved. Use case: dept head AND legal AND HR must all sign off.
 *   (requiredApprovals is ignored in this mode.)
 *
 * NOTE: User.role is singular here, so each ApprovalEvent has one actorRoleId.
 */
function isNodeSatisfied(
	node: FlowNode,
	existingApprovals: { actorId: string; actorRoleId: string | null; }[],
): boolean {
	const mode = node.data.approvalMode ?? 'any';
	const required = node.data.requiredApprovals ?? 1;
	const nodeAssignedRoleIds = node.data.assignedRoles ?? [];

	switch (mode) {
		case 'any': {
			const distinctApprovers = new Set(existingApprovals.map(a => a.actorId));
			return distinctApprovers.size >= required;
		}

		case 'all': {
			// Every assigned role must have at least one approver who holds that role
			const coveredRoles = new Set(
				existingApprovals
					.map(a => a.actorRoleId)
					.filter((rid): rid is string => rid !== null && nodeAssignedRoleIds.includes(rid)),
			);
			return nodeAssignedRoleIds.every((rid: string) => coveredRoles.has(rid));
		}

		default:
			throw new Error(`Unknown approvalMode: ${mode}`);
	}
}

// ─── 4. findMatchingEdge ─────────────────────────────────────────────────────
/**
 * Finds the outgoing edge to follow for the given action.
 *
 * Matching order:
 *   1. Edge whose action field matches the user's action exactly.
 *   2. Edge with action === null / undefined (unconditional fallback).
 *      Useful for simple linear flows with no branching.
 *
 * THROWS for malformed flows (no exit edge defined).
 * The flow editor should validate this at template-save time.
 */
function findMatchingEdge(
	flow: FlowSnapshot,
	currentNodeId: string,
	action: ApprovalAction,
): FlowEdge {
	const outgoing = flow.edges.filter(e => e.source === currentNodeId);
	const exact = outgoing.find(e => e.action === action);
	if (exact) return exact;
	const unconditional = outgoing.find(e => !e.action);
	if (unconditional) return unconditional;
	throw new Error(
		`No outgoing edge for action "${action}" from node "${currentNodeId}". ` +
		`Check the flow definition for this template.`,
	);
}

// ─── 5. resolveAssignees ─────────────────────────────────────────────────────
/**
 * Converts a node's assignedRoles + specificUsers into the AssignedTo shape.
 *
 * NOTE: User.role is SINGULAR in this schema. Query uses:
 *   User.find({ role: { $in: roleIds }, softDelete: false })
 *
 * roleIds  → stored for display
 * userIds  → expanded from roles + specificUsers, used for validation + notify
 */
async function resolveAssignees(node: FlowNode): Promise<{
	roleIds: Types.ObjectId[];
	userIds: Types.ObjectId[];
}> {
	const assignedRoleIds = (node.data.assignedRoles ?? []).map((id: string) => new Types.ObjectId(id));
	const specificUserIds = (node.data.specificUsers ?? []).map((id: string) => new Types.ObjectId(id));

	let usersFromRoles: Types.ObjectId[] = [];
	if (assignedRoleIds.length > 0) {
		// User.roles is an array — query with $in over the assigned role ids
		const users = await User.find({
			roles: { $in: assignedRoleIds },
			softDelete: false,
		})
			.select('_id')
			.lean();
		usersFromRoles = users.map((u: any) => new Types.ObjectId(u._id));
	}

	// Merge, deduplicating specificUsers already covered by roles
	const allUserIds = [
		...usersFromRoles,
		...specificUserIds.filter(
			(sid: Types.ObjectId) => !usersFromRoles.some(uid => uid.toString() === sid.toString()),
		),
	];

	return { roleIds: assignedRoleIds, userIds: allUserIds };
}

// ─── 6. advance ──────────────────────────────────────────────────────────────
/**
 * Moves the submission to the next node.
 * Called only after isNodeSatisfied() returns true.
 *
 * - Updates currentNodeId
 * - If end node: sets status + completedAt
 * - If approval node: resolves new assignees and sets status = 'in_progress'
 *
 * Does NOT save — processAction() batches all writes into one save().
 */
async function advance(
	submission: any,
	nextNode: FlowNode,
): Promise<{ roleIds: Types.ObjectId[]; userIds: Types.ObjectId[]; }> {
	submission.currentNodeId = nextNode.id;

	if (nextNode.type === 'end') {
		const outcome = nextNode.data.outcome;
		submission.status = outcome === 'denied' ? 'denied' : 'approved';
		submission.completedAt = new Date();
		submission.assignedTo = { roleIds: [], userIds: [] };
		return { roleIds: [], userIds: [] };
	}

	if (nextNode.type === 'approval') {
		const newAssignedTo = await resolveAssignees(nextNode);
		submission.assignedTo = newAssignedTo;
		submission.status = 'in_progress';
		return newAssignedTo;
	}

	throw new Error(`Unexpected next node type: "${nextNode.type}" (id: ${nextNode.id})`);
}

// ─── 7. handleForward ────────────────────────────────────────────────────────
/**
 * Reassigns the submission without advancing the flow.
 * The graph position (currentNodeId) stays the same.
 *
 * At least one of forwardTarget.userId or forwardTarget.roleId must be set.
 * If a roleId is given, it is expanded to concrete user ids.
 * Re-forwarding is allowed — each forward creates a new ApprovalEvent.
 *
 * Does NOT save — processAction() handles the save.
 */
async function handleForward(
	submission: any,
	forwardTarget: ForwardTarget,
): Promise<{
	roleIds: Types.ObjectId[];
	userIds: Types.ObjectId[];
	addedUserIds: Types.ObjectId[];
	userName?: string;
	roleName?: string;
}> {
	const newRoleIds: Types.ObjectId[] = submission.assignedTo?.roleIds ? [...submission.assignedTo.roleIds] : [];
	const newUserIds: Types.ObjectId[] = submission.assignedTo?.userIds ? [...submission.assignedTo.userIds] : [];
	const addedUserIds: Types.ObjectId[] = [];
	let userName: string | undefined;
	let roleName: string | undefined;

	if (forwardTarget.userId) {
		const uid = new Types.ObjectId(forwardTarget.userId);
		if (!newUserIds.some(id => id.toString() === uid.toString())) {
			newUserIds.push(uid);
			addedUserIds.push(uid);
		}
		const u = await User.findById(uid).select('username').lean();
		userName = u?.username;
	}

	if (forwardTarget.roleId) {
		const rid = new Types.ObjectId(forwardTarget.roleId);
		if (!newRoleIds.some(id => id.toString() === rid.toString())) {
			newRoleIds.push(rid);
		}
		const roleDoc = await Role.findById(rid).select('name').lean();
		roleName = roleDoc?.name;
		// Expand to concrete users
		const users = await User.find({ roles: rid, softDelete: false }).select('_id').lean();
		for (const u of users) {
			const uid = new Types.ObjectId(u._id);
			if (!newUserIds.some(id => id.toString() === uid.toString())) {
				newUserIds.push(uid);
				addedUserIds.push(uid);
			}
		}
	}

	if (addedUserIds.length === 0) {
		throw new Error('Forward target resolved to zero new users — they may already be assigned');
	}

	submission.assignedTo = { roleIds: newRoleIds, userIds: newUserIds };
	// Status stays 'in_progress' — node has not changed
	return { roleIds: newRoleIds, userIds: newUserIds, addedUserIds, userName, roleName };
}

// ─── 8. notifyAssignees ──────────────────────────────────────────────────────
/**
 * Persists a Notification document for each recipient.
 *
 * Mongo-write ensures offline users receive the notification on next login.
 *
 * TODO: Add Socket.IO emit here once the socket layer is wired.
 * Pattern:
 *   import { emitToUsers } from '../sockets/emitter.js';
 *   await emitToUsers(userIds.map(id => id.toString()), 'notification:new', payload);
 */
async function notifyAssignees(
	userIds: Types.ObjectId[],
	submissionId: Types.ObjectId,
	message: string,
	type: 'action_required' | 'approved' | 'denied' | 'forwarded',
): Promise<void> {
	if (userIds.length === 0) return;
	await Notification.insertMany(
		userIds.map((uid: Types.ObjectId) => ({
			userId: uid,
			submissionId,
			type,
			message,
			read: false,
		})),
	);
	// TODO: emit via Socket.IO when the socket layer is added
}

// ─── PUBLIC ENTRY POINT ───────────────────────────────────────────────────────
/**
 * processAction()
 *
 * THE ONLY public function in this file.
 * Called by: POST /api/submissions/:id/action  (controller — next sprint)
 *
 * @param submissionId  The FormSubmission being acted on.
 * @param actorId       The User taking the action (from JWT).
 * @param action        'approved' | 'denied' | 'forwarded'
 * @param opts.note     Optional actor comment (shown in audit trail).
 * @param opts.forwardTarget  Required when action === 'forwarded'.
 *
 * THROWS on validation/logic errors. The API controller should catch
 * and return the appropriate HTTP status (403, 404, 409, etc.).
 *
 * TRANSACTION NOTE
 * ────────────────
 * The writes below (ApprovalEvent + FormSubmission + Notification) are
 * NOT in a Mongo session/transaction. For this scale this is acceptable —
 * worst case is a partial write leaving the submission in its previous
 * state while an ApprovalEvent exists (recoverable, visible in audit log).
 * If you need strong consistency later, wrap in withTransaction() on a
 * replica set.
 */
export async function processAction(
	submissionId: string | Types.ObjectId,
	actorId: string | Types.ObjectId,
	action: ApprovalAction,
	opts: ProcessActionOptions = {},
): Promise<any> {
	const sid = new Types.ObjectId(submissionId);
	const aid = new Types.ObjectId(actorId);

	// ── Load submission ────────────────────────────────────────────────────────
	const submission = await FormSubmission.findById(sid);
	if (!submission) throw new Error('Submission not found');

	if (submission.status === 'approved' || submission.status === 'denied') {
		throw new Error('Submission is already complete — no further actions allowed');
	}

	const flow = getFlowSnapshot(submission);
	const currentNode = getCurrentNode(submission);

	// Snapshot the before-state for the ApprovalEvent
	const previousAssignedTo = {
		roleIds: [...(submission.assignedTo?.roleIds ?? [])],
		userIds: [...(submission.assignedTo?.userIds ?? [])],
	};

	// ── 1. Validate actor ──────────────────────────────────────────────────────
	const { actorName, actorRoleId } = await validateActor(submission, aid);

	// ══════════════════════════════════════════════════════════════════════════
	// FORWARD PATH
	// ══════════════════════════════════════════════════════════════════════════
	if (action === 'forwarded') {
		if (!opts.forwardTarget) throw new Error('forwardTarget is required for a forward action');

		const { userIds: newUserIds, roleIds: newRoleIds, addedUserIds, userName, roleName } =
			await handleForward(submission, opts.forwardTarget);

		await ApprovalEvent.create({
			submissionId: sid,
			nodeId: currentNode.id,
			nodeLabel: currentNode.data.label,
			actorId: aid,
			actorName,
			actorRoleId,
			action: 'forwarded',
			forwardedTo: {
				userId: opts.forwardTarget.userId ? new Types.ObjectId(opts.forwardTarget.userId) : null,
				userName: userName ?? null,
				roleId: opts.forwardTarget.roleId ? new Types.ObjectId(opts.forwardTarget.roleId) : null,
				roleName: roleName ?? null,
			},
			previousAssignedTo,
			nextNodeId: null,       // flow did not advance
			nextNodeLabel: null,
			note: opts.note ?? null,
		});

		await submission.save();

		await notifyAssignees(
			addedUserIds,
			sid,
			`A form has been forwarded to you: "${currentNode.data.label}"`,
			'forwarded',
		);

		return submission;
	}

	// ══════════════════════════════════════════════════════════════════════════
	// APPROVE / DENY PATH
	// ══════════════════════════════════════════════════════════════════════════

	// ── 2. Collect prior approvals and denials for this node ───────────────────
	const priorEvents = await ApprovalEvent.find({
		submissionId: sid,
		nodeId: currentNode.id,
		action: { $in: ['approved', 'denied'] },
	}).select('actorId actorRoleId action').lean();

	interface ActorApproval {
		actorId: string;
		actorRoleId: string | null;
	}

	const allApprovals: ActorApproval[] = priorEvents
		.filter((e: any) => e.action === 'approved')
		.map((e: any) => ({ actorId: e.actorId.toString(), actorRoleId: e.actorRoleId?.toString() ?? null }));
	
	const allDenials: ActorApproval[] = priorEvents
		.filter((e: any) => e.action === 'denied')
		.map((e: any) => ({ actorId: e.actorId.toString(), actorRoleId: e.actorRoleId?.toString() ?? null }));

	// Add the current action to the respective list
	if (action === 'approved') {
		allApprovals.push({ actorId: aid.toString(), actorRoleId: actorRoleId?.toString() ?? null });
	} else if (action === 'denied') {
		allDenials.push({ actorId: aid.toString(), actorRoleId: actorRoleId?.toString() ?? null });
	}

	// ── 3. Check if Deny condition is satisfied ────────────────────────────────
	// The deny follows the same logic (mode and count) as defined in the node,
	// or it can have its own properties. Assuming it uses denyMode / requiredDenials, defaulting to approvalMode/requiredApprovals if not set.
	const denyMode = currentNode.data.denyMode ?? currentNode.data.approvalMode ?? 'any';
	const requiredDenials = currentNode.data.requiredDenials ?? currentNode.data.requiredApprovals ?? 1;
	const nodeAssignedRoleIds = currentNode.data.assignedRoles ?? [];

	let denySatisfied = false;
	if (denyMode === 'any') {
		const distinctDeniers = new Set(allDenials.map(a => a.actorId));
		denySatisfied = distinctDeniers.size >= requiredDenials;
	} else if (denyMode === 'all') {
		const coveredRoles = new Set(
			allDenials
				.map(a => a.actorRoleId)
				.filter((rid): rid is string => rid !== null && nodeAssignedRoleIds.includes(rid)),
		);
		denySatisfied = nodeAssignedRoleIds.every((rid: string) => coveredRoles.has(rid));
	}

	if (denySatisfied) {
		submission.status = 'denied';
		submission.completedAt = new Date();

		await ApprovalEvent.create({
			submissionId: sid,
			nodeId: currentNode.id,
			nodeLabel: currentNode.data.label,
			actorId: aid,
			actorName,
			actorRoleId,
			action,
			forwardedTo: null,
			previousAssignedTo,
			nextNodeId: '__denied',
			nextNodeLabel: 'Denied',
			note: opts.note ?? null,
		});

		return submission;
	}

	// ── 4. Check if Approval condition is satisfied ────────────────────────────
	const satisfied = isNodeSatisfied(currentNode, allApprovals);

	let nextNodeId: string | null = null;
	let nextNodeLabel: string | null = null;
	let newAssignedTo: { roleIds: Types.ObjectId[]; userIds: Types.ObjectId[]; } =
		{ roleIds: [], userIds: [] };

	if (satisfied) {
		const edge = findMatchingEdge(flow, currentNode.id, 'approved');
		const nextNode = flow.nodes.find((n: FlowNode) => n.id === edge.target);
		if (!nextNode) throw new Error(`Edge target node "${edge.target}" not found in flow`);

		nextNodeId = nextNode.id;
		nextNodeLabel = nextNode.data.label;
		newAssignedTo = await advance(submission, nextNode);
	}

	// ── Write ApprovalEvent ────────────────────────────────────────────────────
	await ApprovalEvent.create({
		submissionId: sid,
		nodeId: currentNode.id,
		nodeLabel: currentNode.data.label,
		actorId: aid,
		actorName,
		actorRoleId,
		action,
		forwardedTo: null,
		previousAssignedTo,
		nextNodeId,
		nextNodeLabel,
		note: opts.note ?? null,
	});

	// ── Save submission ────────────────────────────────────────────────────────
	await submission.save();

	// ── Notify ─────────────────────────────────────────────────────────────────
	if (satisfied) {
		if (newAssignedTo.userIds.length > 0) {
			// Next approval step — notify new assignees
			const nextNode = flow.nodes.find((n: FlowNode) => n.id === nextNodeId);
			await notifyAssignees(
				newAssignedTo.userIds,
				sid,
				`Your approval is required: "${nextNode?.data.label ?? 'next step'}"`,
				'action_required',
			);
		} else if (submission.status === 'approved' || submission.status === 'denied') {
			// Terminal state — notify the original submitter
			await notifyAssignees(
				[new Types.ObjectId(submission.submitterId)],
				sid,
				`Your form has been ${submission.status}.`,
				submission.status as 'approved' | 'denied',
			);
		}
	}

	return submission;
}
