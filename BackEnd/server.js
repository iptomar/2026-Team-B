import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Notification from "./models/Notification.js";
import FormSubmission from "./models/FormSubmission.js";
import multer from "multer";
import crypto from "crypto";

// Load environment variables from .env file

dotenv.config();

// Get current file's directory path (ES modules equivalent of __dirname)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app and HTTP server

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Socket.IO Configuration ─────────────────────────────────────────────────
// Set up WebSocket server for real-time notifications
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
	}
});

// Socket.IO authentication middleware
// Verifies JWT token before allowing WebSocket connection
io.use((socket, next) => {
	const token = socket.handshake.auth.token;
	if (!token) {
		return next(new Error("Authentication error: No token provided"));
	}
	try {
		const jwtSecret = process.env.JWT_SECRET;
		const decoded = jwt.verify(token, jwtSecret);
		socket.data.userId = decoded.id;
		next();
	} catch (error) {
		next(new Error("Authentication error: Invalid token"));
	}
});
// Handle new WebSocket connections

io.on("connection", (socket) => {
	const userId = socket.data.userId;
	if (userId) {
		socket.join(`user_${userId}`);
	}
});

// ─── Express Middleware ─────────────────────────────────────────────────────
app.use(cors());// Enable CORS for all routes
app.use(express.json({ limit: '5mb' }));// Parse JSON bodies (max 5MB)
app.use(express.urlencoded({ limit: '5mb', extended: true })); // Parse URL-encoded bodies

// ─── Swagger Documentation ──────────────────────────────────────────────────
// Serve API documentation at /docs endpoint
try {
	const swaggerDocument = JSON.parse(
		fs.readFileSync(new URL("./public/swagger.json", import.meta.url))
	);
	app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
	console.log('Swagger documentation not found. Run "npm run swagger" to generate it.');
}

// ─── MongoDB Connection & Change Streams ────────────────────────────────────
// Connect to database and set up real-time notification listeners
connectDB().then(() => {
	try {
		const notificationChangeStream = Notification.watch([{ $match: { operationType: 'insert' } }]);
		notificationChangeStream.on('change', (change) => {
			const newNotification = change.fullDocument;
			if (newNotification && newNotification.userId) {
				const room = `user_${newNotification.userId.toString()}`;
				io.to(room).emit('new_notification', {
					_id: newNotification._id.toString(),
					userId: newNotification.userId.toString(),
					submissionId: newNotification.submissionId.toString(),
					type: newNotification.type,
					message: newNotification.message,
					read: newNotification.read,
					createdAt: newNotification.createdAt
				});
			}
		});

		const submissionChangeStream = FormSubmission.watch([], { fullDocument: 'updateLookup' });
		submissionChangeStream.on('change', (change) => {
			if (change.operationType === 'update' || change.operationType === 'replace' || change.operationType === 'insert') {
				const doc = change.fullDocument;
				if (doc) {
					io.emit('submission_updated', {
						submissionId: doc._id.toString(),
						status: doc.status,
						currentNodeId: doc.currentNodeId,
						assignedTo: doc.assignedTo,
						eventType: change.operationType === 'insert' ? 'new_submission' : 'status_changed'
					});
				}
			}
		});
	} catch (error) {
		console.log('MongoDB change streams not supported in this environment (likely not a replica set). Notifications will fall back to poll/reload.');
	}
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Extracts user ID from the Authorization Bearer token
 * @param req - Express request object
 * @returns User ID if valid token, null otherwise
 */
function extractUserId(req) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
	try {
		const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
		return decoded.id;
	} catch { return null; }
}

// ─── Multer config (in-memory, 10 MB per file, max 10 files) ────────────────
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

/**
 * POST /formSubmissions/upload
 * Handles multipart file upload submissions (forms with attachments)
 * 
 * This endpoint processes form submissions that include file attachments.
 * Files are uploaded to Azure Blob Storage, and the submission is stored
 * in MongoDB with references to the uploaded files.
 */
app.post('/formSubmissions/upload', upload.array('files', 10), async (req, res) => {
	try {
		const userId = extractUserId(req);
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });

		const { templateId, formData: formDataStr, fileFieldMap: fileFieldMapStr } = req.body;
		if (!templateId || formDataStr === undefined) {
			return res.status(400).json({ message: 'templateId and formData are required' });
		}

		let formData;
		try { formData = JSON.parse(formDataStr); }
		catch { return res.status(400).json({ message: 'formData must be a valid JSON string' }); }

		let fileFieldMap = [];
		try { if (fileFieldMapStr) fileFieldMap = JSON.parse(fileFieldMapStr); }
		catch { /* ignore — optional */ }

		// Dynamic imports for ES-module models/services
		const { default: FormTemplate } = await import("./models/FormTemplate.js");
		const { default: FormSubmission } = await import("./models/FormSubmission.js");
		const { default: User } = await import("./models/User.js");
		const { default: ApprovalEvent } = await import("./models/ApprovalEvent.js");
		const { uploadBlob } = await import("./services/blobService.js");
		const mongoose = await import("mongoose");
		const Types = mongoose.Types;

		const templateDoc = await FormTemplate.findById(templateId);
		if (!templateDoc) return res.status(404).json({ message: 'Form template not found' });
		if (templateDoc.softDelete) return res.status(409).json({ message: 'This form template has been deprecated.' });
		if (templateDoc.replacedBy) return res.status(409).json({ message: 'A newer version of this form is available.' });

		let parsedTemplate;
		try { parsedTemplate = JSON.parse(templateDoc.template); }
		catch { return res.status(500).json({ message: 'Failed to parse template JSON' }); }

		// Inject submitted values into the template layout
		if (parsedTemplate.layout && Array.isArray(parsedTemplate.layout)) {
			parsedTemplate.layout.forEach((row) => {
				if (row.columns && Array.isArray(row.columns)) {
					row.columns.forEach((col) => {
						if (col.field && col.field.id) {
							const submittedValue = formData[col.field.id];
							col.field.submittedValue = submittedValue !== undefined ? submittedValue : null;
						}
					});
				}
			});
		}

		const augmentedDataStr = JSON.stringify(parsedTemplate);
		const flowSnapshot = parsedTemplate.flow ?? null;
		const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'form-attachments';

		// Upload files to Azure Blob Storage
		const files = req.files || [];
		const attachments = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const fieldId = fileFieldMap[i] || 'unknown';
			const ext = path.extname(file.originalname);
			const blobName = `submissions/${templateId}/${crypto.randomUUID()}${ext}`;

			await uploadBlob(containerName, blobName, file.buffer, file.mimetype);

			attachments.push({
				fieldId,
				originalName: file.originalname,
				blobName,
				containerName,
				contentType: file.mimetype,
				size: file.size,
			});
		}

		// Create submission document
		const newSubmission = new FormSubmission({
			templateId: templateDoc._id,
			submitterId: userId,
			submittedData: augmentedDataStr,
			flowSnapshot,
			status: 'submitted',
			attachments,
		});

		await newSubmission.save();

		// ── Seed the flow engine (same logic as TSOA controller) ────────────
		if (flowSnapshot && Array.isArray(flowSnapshot.nodes)) {
			try {
				const startNode = flowSnapshot.nodes.find((n) => n.type === 'start');
				if (startNode) {
					newSubmission.currentNodeId = startNode.id;
					const edges = flowSnapshot.edges ?? [];
					const outEdge = edges.find((e) => e.source === startNode.id);
					if (outEdge) {
						const nextNode = flowSnapshot.nodes.find((n) => n.id === outEdge.target);
						if (nextNode) {
							newSubmission.currentNodeId = nextNode.id;
							if (nextNode.type === 'end') {
								newSubmission.status = nextNode.data?.outcome === 'denied' ? 'denied' : 'approved';
								newSubmission.completedAt = new Date();
								newSubmission.assignedTo = { roleIds: [], userIds: [] };
							} else if (nextNode.type === 'approval') {
								const assignedRoleIds = (nextNode.data?.assignedRoles ?? [])
									.map((id) => new Types.ObjectId(id));
								const specificUserIds = (nextNode.data?.specificUsers ?? [])
									.map((id) => new Types.ObjectId(id));
								let usersFromRoles = [];
								if (assignedRoleIds.length > 0) {
									const usersInRoles = await User.find({
										roles: { $in: assignedRoleIds },
										softDelete: false,
									}).select('_id').lean();
									usersFromRoles = usersInRoles.map((u) => new Types.ObjectId(u._id));
								}
								const allUserIds = [
									...usersFromRoles,
									...specificUserIds.filter(
										(sid) => !usersFromRoles.some(uid => uid.toString() === sid.toString()),
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
				console.error('[upload] Engine seeding error:', engineErr);
			}
		}

		// ── Create initial ApprovalEvent ─────────────────────────────────────
		try {
			const submitter = await User.findById(userId).select('username roles').lean();
			let startNodeId = 'start', startNodeLabel = 'Start', nextNodeLabel = null;
			if (flowSnapshot && Array.isArray(flowSnapshot.nodes)) {
				const startNode = flowSnapshot.nodes.find((n) => n.type === 'start');
				if (startNode) { startNodeId = startNode.id; startNodeLabel = startNode.data?.label || 'Start'; }
				const nextNode = flowSnapshot.nodes.find((n) => n.id === newSubmission.currentNodeId);
				if (nextNode) nextNodeLabel = nextNode.data?.label || null;
			}
			await ApprovalEvent.create({
				submissionId: newSubmission._id,
				nodeId: startNodeId,
				nodeLabel: startNodeLabel,
				actorId: userId,
				actorName: submitter?.username || 'Unknown',
				actorRoleId: submitter?.roles?.length > 0 ? new Types.ObjectId(submitter.roles[0]) : null,
				action: 'submitted',
				previousAssignedTo: { roleIds: [], userIds: [] },
				nextNodeId: newSubmission.currentNodeId,
				nextNodeLabel,
				note: 'Form submitted',
			});
		} catch (eventErr) {
			console.error('[upload] Failed to create initial ApprovalEvent:', eventErr);
		}

		return res.status(200).json(newSubmission);
	} catch (err) {
		console.error('[upload] Unexpected error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * GET /formSubmissions/:submissionId/files/:blobName/sas
 * Generates a SAS (Shared Access Signature) URL for secure file access
 * 
 * This endpoint returns a time-limited URL that allows the client to
 * directly download the file from Azure Blob Storage without exposing
 * storage account credentials.
 */
app.get('/formSubmissions/:submissionId/files/:blobName(*)/sas', async (req, res) => {
	try {
		const userId = extractUserId(req);
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });

		const { submissionId, blobName } = req.params;

		const { default: FormSubmission } = await import("./models/FormSubmission.js");
		const { default: User } = await import("./models/User.js");
		const { generateSasUrl } = await import("./services/blobService.js");

		if (!/^[0-9a-fA-F]{24}$/.test(submissionId)) {
			return res.status(404).json({ message: 'Submission not found' });
		}

		const submission = await FormSubmission.findById(submissionId).lean();
		if (!submission) return res.status(404).json({ message: 'Submission not found' });

		// Access check: submitter, assigned approver, or admin
		const isSubmitter = submission.submitterId?.toString() === userId;
		const isAssigned = (submission.assignedTo?.userIds ?? [])
			.some((uid) => uid.toString() === userId);
		const requestingUser = await User.findById(userId).populate('roles').lean();
		const isAdmin = requestingUser?.roles?.some((r) => r.name?.toLowerCase() === 'admin');

		if (!isSubmitter && !isAssigned && !isAdmin) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		// Verify the blob belongs to this submission
		const attachment = (submission.attachments ?? []).find((a) => a.blobName === blobName);
		if (!attachment) {
			return res.status(404).json({ message: 'File not found in this submission' });
		}

		const url = generateSasUrl(attachment.containerName, attachment.blobName, 15);
		return res.status(200).json({ url });
	} catch (err) {
		console.error('[sas] Unexpected error:', err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

// tsoa routes
const { RegisterRoutes } = await import("./routes/routes.js");
RegisterRoutes(app, { multer: upload });

// serve react build last so deployment doesn't get hijacked by react and API stops working
// define the absolute path to the frontend BUILD directory
const buildPath = path.join(__dirname, '../FrontEnd/build');
app.use(express.static(buildPath));

app.get("*", (req, res) => {
	res.sendFile(path.join(buildPath, "index.html"));
});

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});