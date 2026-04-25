import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

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
connectDB();

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

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});