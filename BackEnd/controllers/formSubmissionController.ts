import { Controller, Get, Post, Route, Body, Request, Tags, Response, Path } from 'tsoa';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { processAction, ApprovalAction } from '../services/flowEngine.js';
// @ts-ignore
import FormTemplate from '../models/FormTemplate.js';
// @ts-ignore
import FormSubmission from '../models/FormSubmission.js';
// @ts-ignore
import User from '../models/User.js';
// @ts-ignore
import ApprovalEvent from '../models/ApprovalEvent.js';

export interface FormSubmissionCreationParams {
	templateId: string;
	formData: string;
}

export interface FormSubmissionResponse {
	_id: string;
	templateId: string;
	submitterId: string;
	submittedData: string;
	status: string;
	createdAt: string;
}

export interface MySubmission {
	_id: string;
	templateId: string;
	templateTitle: string;
	submittedData: string;
	status: string;
	createdAt: string;
}

export interface ApprovalActionParams {
	/** 'approved' | 'denied' | 'forwarded' */
	action: string;
	/** Optional free-text comment visible in the audit trail */
	note?: string;
	/** Required when action === 'forwarded'. Provide one of userId or roleId. */
	forwardTarget?: {
		userId?: string;
		roleId?: string;
	};
}

export interface PendingSubmission {
	_id: string;
	templateId: string;
	templateTitle: string;
	submitterId: string;
	submitterName: string;
	status: string;
	currentNodeId: string;
	currentNodeLabel: string;
	assignedRoleNames: string[];
	createdAt: string;
}

export interface ApprovalEventResponse {
	_id: string;
	nodeId: string;
	nodeLabel: string;
	actorId: string;
	actorName: string;
	action: string;
	nextNodeId: string | null;
	nextNodeLabel: string | null;
	note: string | null;
	forwardedTo: {
		userId: string | null;
		userName: string | null;
		roleId: string | null;
		roleName: string | null;
	} | null;
	createdAt: string;
}

@Route('formSubmissions')
@Tags('FormSubmissions')
export class FormSubmissionController extends Controller {

	private extractUserIdFromRequest(req: express.Request): string | null {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return null;
		}

		const token = authHeader.split(' ')[1];
		try {
			const jwtSecret = process.env.JWT_SECRET as string;
			const decoded: any = jwt.verify(token, jwtSecret);
			return decoded.id;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Submit a form instance
	 */
	@Post()
	@Response('400', 'Invalid data or missing fields')
	@Response('401', 'Unauthorized')
	@Response('404', 'Template not found')
	public async submitForm(
		@Request() req: express.Request,
		@Body() requestBody: FormSubmissionCreationParams
	): Promise<FormSubmissionResponse | { message: string; }> {

		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const { templateId, formData: formDataStr } = requestBody;

		if (!templateId || formDataStr === undefined) {
			this.setStatus(400);
			return { message: 'templateId and formData are required' };
		}

		let formData: Record<string, any>;
		try {
			formData = JSON.parse(formDataStr);
		} catch {
			this.setStatus(400);
			return { message: 'formData must be a valid JSON string' };
		}

		const templateDoc = await FormTemplate.findById(templateId);
		if (!templateDoc) {
			this.setStatus(404);
			return { message: 'Form template not found' };
		}

		// Reject submission if template has been soft-deleted (deprecated)
		if (templateDoc.softDelete) {
			this.setStatus(409);
			return { message: 'This form template has been deprecated and can no longer be submitted.' };
		}

		// Reject submission if template has been superseded by a newer version
		if (templateDoc.replacedBy) {
			this.setStatus(409);
			return { message: 'A newer version of this form is available. Please refresh and use the latest version.' };
		}

		let parsedTemplate: any;
		try {
			parsedTemplate = JSON.parse(templateDoc.template);
		} catch (error) {
			this.setStatus(500);
			return { message: 'Failed to parse original form template JSON' };
		}

		// Inject submitted values into the template layout
		if (parsedTemplate.layout && Array.isArray(parsedTemplate.layout)) {
			parsedTemplate.layout.forEach((row: any) => {
				if (row.columns && Array.isArray(row.columns)) {
					row.columns.forEach((col: any) => {
						if (col.field && col.field.id) {
							const submittedValue = formData[col.field.id];
							col.field.submittedValue = submittedValue !== undefined ? submittedValue : null;
						}
					});
				}
			});
		}

		// Stringify the augmented template structure
		const augmentedDataStr = JSON.stringify(parsedTemplate);

		// ── Extract flow snapshot from template ──────────────────────────────
		// The template JSON contains a top-level "flow" key with { nodes, edges }.
		// We store it separately as flowSnapshot so the engine can read it
		// without re-parsing submittedData on every action.
		const flowSnapshot = parsedTemplate.flow ?? null;

		const newSubmission = new FormSubmission({
			templateId: templateDoc._id,
			submitterId: userId,
			submittedData: augmentedDataStr,
			flowSnapshot,
			status: 'submitted',
		});

		await newSubmission.save();

		// ── Seed the flow engine ─────────────────────────────────────────────
		// Advance past the start node so assignedTo is populated immediately.
		// Without this, the pending-reviews query would never surface this doc.
		if (flowSnapshot && Array.isArray(flowSnapshot.nodes)) {
			try {
				const startNode = flowSnapshot.nodes.find((n: any) => n.type === 'start');
				if (startNode) {
					// Set position to start node first
					newSubmission.currentNodeId = startNode.id;

					// Find the outgoing edge from the start node
					const edges: any[] = flowSnapshot.edges ?? [];
					const outEdge = edges.find((e: any) => e.source === startNode.id);
					if (outEdge) {
						const nextNode = flowSnapshot.nodes.find((n: any) => n.id === outEdge.target);
						if (nextNode) {
							newSubmission.currentNodeId = nextNode.id;

							if (nextNode.type === 'end') {
								// Single-step flow goes straight to an end node
								newSubmission.status = nextNode.data?.outcome === 'denied' ? 'denied' : 'approved';
								newSubmission.completedAt = new Date();
								newSubmission.assignedTo = { roleIds: [], userIds: [] };
							} else if (nextNode.type === 'approval') {
								// Resolve assigned roles → users for the first approval node
								const assignedRoleIds: Types.ObjectId[] = (nextNode.data?.assignedRoles ?? [])
									.map((id: string) => new Types.ObjectId(id));
								const specificUserIds: Types.ObjectId[] = (nextNode.data?.specificUsers ?? [])
									.map((id: string) => new Types.ObjectId(id));

								let usersFromRoles: Types.ObjectId[] = [];
								if (assignedRoleIds.length > 0) {
									const usersInRoles = await User.find({
										role: { $in: assignedRoleIds },
										softDelete: false,
									}).select('_id').lean();
									usersFromRoles = usersInRoles.map((u: any) => new Types.ObjectId(u._id));
								}

								const allUserIds = [
									...usersFromRoles,
									...specificUserIds.filter(
										(sid: Types.ObjectId) => !usersFromRoles.some(uid => uid.toString() === sid.toString()),
									),
								];

								newSubmission.assignedTo = { roleIds: assignedRoleIds, userIds: allUserIds };
								newSubmission.status = 'in_progress';
							}

							await newSubmission.save();
						}
					}
				}
			} catch (engineErr) {
				// Engine seeding failed — submission stays in 'submitted' state.
				// Not a fatal error; log and continue.
				console.error('[submitForm] Engine seeding error:', engineErr);
			}
		}

		return newSubmission as unknown as FormSubmissionResponse;
	}

	/**
	 * Get the current user's submitted forms
	 */
	@Get('my')
	@Response('401', 'Unauthorized')
	public async getMySubmissions(
		@Request() req: express.Request
	): Promise<MySubmission[] | { message: string; }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const submissions = await FormSubmission
			.find({ submitterId: userId })
			.sort({ createdAt: -1 })
			.populate('templateId', 'title')
			.lean();

		return submissions.map((s: any) => ({
			_id: s._id.toString(),
			templateId: s.templateId?._id?.toString() ?? s.templateId?.toString(),
			templateTitle: s.templateId?.title ?? 'Unknown Form',
			submittedData: s.submittedData,
			status: s.status,
			createdAt: s.createdAt?.toISOString?.() ?? s.createdAt
		}));
	}

	/**
	 * List all submissions currently assigned to the authenticated user
	 * (i.e. forms pending their approval action).
	 * NOTE: This must be defined before {submissionId} to avoid route conflict.
	 */
	@Get('pending')
	@Response('401', 'Unauthorized')
	public async getPendingSubmissions(
		@Request() req: express.Request,
	): Promise<PendingSubmission[] | { message: string; }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const submissions = await FormSubmission
			.find({
				'assignedTo.userIds': userId,
				status: 'in_progress',
			})
			.populate('templateId', 'title')
			.populate('submitterId', 'username')
			.lean();

		// @ts-ignore
		const Role = (await import('../models/Role.js')).default;

		const result: PendingSubmission[] = await Promise.all(
			(submissions as any[]).map(async (s) => {
				// Resolve role names for display
				const roleIds: any[] = s.assignedTo?.roleIds ?? [];
				let assignedRoleNames: string[] = [];
				if (roleIds.length > 0) {
					const roles = await Role.find({ _id: { $in: roleIds } }).select('name').lean();
					assignedRoleNames = (roles as any[]).map((r: any) => r.name);
				}

				// Find current node label from flowSnapshot
				let currentNodeLabel = 'Unknown step';
				try {
					const flow = s.flowSnapshot ?? JSON.parse(s.submittedData)?.flow;
					if (flow) {
						const node = flow.nodes?.find((n: any) => n.id === s.currentNodeId);
						if (node) currentNodeLabel = node.data?.label ?? currentNodeLabel;
					}
				} catch { /* ignore parse errors */ }

				return {
					_id: s._id.toString(),
					templateId: s.templateId?._id?.toString() ?? s.templateId?.toString(),
					templateTitle: s.templateId?.title ?? 'Unknown Form',
					submitterId: s.submitterId?._id?.toString() ?? s.submitterId?.toString(),
					submitterName: s.submitterId?.username ?? 'Unknown',
					status: s.status,
					currentNodeId: s.currentNodeId ?? '',
					currentNodeLabel,
					assignedRoleNames,
					createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
				};
			}),
		);

		return result;
	}

	/**
	 * Submit an approve / deny / forward action on a form submission.
	 * The actor must be in the current assignedTo list.
	 */
	@Post('{submissionId}/action')
	@Tags('Approvals')
	@Response('400', 'Missing or invalid action')
	@Response('401', 'Unauthorized')
	@Response('403', 'Actor not assigned to this submission')
	@Response('404', 'Submission not found')
	@Response('409', 'Submission already complete')
	public async submitAction(
		@Path() submissionId: string,
		@Request() req: express.Request,
		@Body() body: ApprovalActionParams,
	): Promise<{ message: string; status?: string; }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const validActions: ApprovalAction[] = ['approved', 'denied', 'forwarded'];
		if (!body.action || !validActions.includes(body.action as ApprovalAction)) {
			this.setStatus(400);
			return { message: `action must be one of: ${validActions.join(', ')}` };
		}

		if (body.action === 'forwarded' && !body.forwardTarget?.userId && !body.forwardTarget?.roleId) {
			this.setStatus(400);
			return { message: 'forwardTarget.userId or forwardTarget.roleId is required for a forward action' };
		}

		try {
			const updated = await processAction(
				submissionId,
				userId,
				body.action as ApprovalAction,
				{
					note: body.note,
					forwardTarget: body.forwardTarget,
				},
			);
			return { message: 'Action recorded successfully', status: updated.status };
		} catch (err: any) {
			const msg: string = err?.message ?? 'Unknown error';

			if (msg.includes('not found')) {
				this.setStatus(404);
				return { message: msg };
			}
			if (msg.startsWith('UNAUTHORISED')) {
				this.setStatus(403);
				return { message: 'You are not assigned to this submission' };
			}
			if (msg.includes('already complete')) {
				this.setStatus(409);
				return { message: msg };
			}
			this.setStatus(400);
			return { message: msg };
		}
	}

	/**
	 * Get the audit trail (ApprovalEvents) for a submission.
	 * The actor must own the submission OR be an assigned approver.
	 */
	@Get('{submissionId}/events')
	@Tags('Approvals')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden')
	@Response('404', 'Submission not found')
	public async getSubmissionEvents(
		@Path() submissionId: string,
		@Request() req: express.Request,
	): Promise<ApprovalEventResponse[] | { message: string; }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		const submission = await FormSubmission.findById(submissionId).lean() as any;
		if (!submission) {
			this.setStatus(404);
			return { message: 'Submission not found' };
		}

		const isSubmitter = submission.submitterId?.toString() === userId;
		const isAssigned = (submission.assignedTo?.userIds ?? [])
			.some((uid: any) => uid.toString() === userId);

		const hasEvent = await ApprovalEvent.exists({ submissionId, actorId: userId });

		if (!isSubmitter && !isAssigned && !hasEvent) {
			this.setStatus(403);
			return { message: 'Forbidden' };
		}

		const events = await ApprovalEvent
			.find({ submissionId })
			.sort({ createdAt: 1 })
			.lean();

		return (events as any[]).map((e) => ({
			_id: e._id.toString(),
			nodeId: e.nodeId,
			nodeLabel: e.nodeLabel,
			actorId: e.actorId.toString(),
			actorName: e.actorName,
			action: e.action,
			nextNodeId: e.nextNodeId ?? null,
			nextNodeLabel: e.nextNodeLabel ?? null,
			note: e.note ?? null,
			forwardedTo: e.forwardedTo ?? null,
			createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
		}));
	}

	/**
	 * Get a single submission by ID (for read-only view).
	 * The authenticated user must be the submitter OR an assigned approver.
	 */
	@Get('{submissionId}')
	@Response('401', 'Unauthorized')
	@Response('403', 'Forbidden')
	@Response('404', 'Submission not found')
	public async getSubmissionById(
		@Path() submissionId: string,
		@Request() req: express.Request
	): Promise<MySubmission | { message: string; }> {
		const userId = this.extractUserIdFromRequest(req);
		if (!userId) {
			this.setStatus(401);
			return { message: 'Unauthorized' };
		}

		// Validate if submissionId is a valid ObjectId string. 
		// If not (e.g. "pending"), return 404 immediately to avoid CastError.
		if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
			this.setStatus(404);
			return { message: 'Submission not found' };
		}

		const submission = await FormSubmission
			.findById(submissionId)
			.populate('templateId', 'title')
			.lean() as any;

		if (!submission) {
			this.setStatus(404);
			return { message: 'Submission not found' };
		}

		const isSubmitter = submission.submitterId?.toString() === userId;
		const isAssigned = (submission.assignedTo?.userIds ?? [])
			.some((uid: any) => uid.toString() === userId);

		if (!isSubmitter && !isAssigned) {
			this.setStatus(403);
			return { message: 'Forbidden' };
		}

		return {
			_id: submission._id.toString(),
			templateId: submission.templateId?._id?.toString() ?? submission.templateId?.toString(),
			templateTitle: submission.templateId?.title ?? 'Unknown Form',
			submittedData: submission.submittedData,
			status: submission.status,
			createdAt: submission.createdAt?.toISOString?.() ?? submission.createdAt
		};
	}
}
