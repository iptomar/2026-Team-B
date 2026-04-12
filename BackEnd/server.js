import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import { RegisterRoutes } from './routes/routes.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Setup Swagger UI
let swaggerDocument;
try {
  swaggerDocument = JSON.parse(fs.readFileSync(new URL('./public/swagger.json', import.meta.url)));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.log('Swagger documentation not found. Run "npm run swagger" to generate it.');
}

// Database Connection
connectDB();

// Basic route for testing
app.get('/', (req, res) => {
  res.send('A API do Construtor de Formulários está a correr');
});

// Register TSOA Routes
RegisterRoutes(app);

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
