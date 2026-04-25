import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const migrate = async () => {
	try {
		const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/formbuilder';
		console.log(`Conectando a MongoDB: ${mongoUri}...`);

		await mongoose.connect(mongoUri);
		console.log('MongoDB Conectado.');

		console.log('Sincronizando índices para o modelo User (recovery_token)...');

		// Mongoose.syncIndexes() garante que os índices definidos no esquema (incluindo unique/sparse) 
		// sejam criados ou atualizados na base de dados.
		await User.syncIndexes();

		console.log('✅ Índices sincronizados com sucesso.');

		process.exit(0);
	} catch (error) {
		console.error(`❌ Erro durante a migração: ${error.message}`);
		process.exit(1);
	}
};

migrate();
