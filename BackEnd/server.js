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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
	}
});

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

io.on("connection", (socket) => {
	const userId = socket.data.userId;
	if (userId) {
		socket.join(`user_${userId}`);
	}
});

// middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// swagger
try {
	const swaggerDocument = JSON.parse(
		fs.readFileSync(new URL("./public/swagger.json", import.meta.url))
	);
	app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
	console.log('Swagger documentation not found. Run "npm run swagger" to generate it.');
}

// connect to mongoDB
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
	} catch (error) {
		console.log('MongoDB change streams not supported in this environment (likely not a replica set). Notifications will fall back to poll/reload.');
	}
});

// tsoa routes
const { RegisterRoutes } = await import("./routes/routes.js");
RegisterRoutes(app);

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