import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// setup Swagger UI
let swaggerDocument;
try {
	swaggerDocument = JSON.parse(fs.readFileSync(new URL('./public/swagger.json', import.meta.url)));
	app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
	console.log('Swagger documentation not found. Run "npm run swagger" to generate it.');
}

// connect to mongoDB
connectDB();

// dynamic import, ensure it runs after the dotenv.config()
const { RegisterRoutes } = await import('./routes/routes.js');
// register TSOA routes
RegisterRoutes(app);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
