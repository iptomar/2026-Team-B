import mongoose from 'mongoose';

/**
 * Estabelece a conexão com a base de dados MongoDB.
 * Utiliza variáveis de ambiente para manter a segurança das credenciais.
 */

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI, {
		});

		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
};

export default connectDB;
