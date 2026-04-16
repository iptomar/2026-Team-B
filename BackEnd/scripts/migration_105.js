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

    console.log('A verificar/criar índices para o modelo User...');
    
    // Mongoose.syncIndexes() ensures the indexes defined in the schema exist in the DB
    await User.syncIndexes();
    
    console.log('Índices sincronizados com sucesso (incluindo recovery_token).');
    
    // Opcional: Garantir que documentos existentes tenham os campos como null se necessário
    // No Mongoose, campos opcionais não precisam ser explicitamente definidos como null
    // em todos os documentos, mas podemos fazê-lo se desejado:
    // await User.updateMany({ recovery_token: { $exists: false } }, { $set: { recovery_token: null, recovery_token_expires_at: null } });

    process.exit(0);
  } catch (error) {
    console.error(`Erro durante a migração: ${error.message}`);
    process.exit(1);
  }
};

migrate();
