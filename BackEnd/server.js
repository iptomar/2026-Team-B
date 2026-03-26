import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Basic route for testing
app.get('/', (req, res) => {
  res.send('A API do Construtor de Formulários está a correr');
});

// TODO: Rotas da API serão injetadas aqui
// app.use('/api/forms', formRoutes);

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
