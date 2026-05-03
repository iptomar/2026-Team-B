import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function dropIndex() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log('Connected to MongoDB');

		const db = mongoose.connection.db;
		const collection = db.collection('approvalevents');

		const indexes = await collection.indexes();
		console.log('Current indexes:', indexes.map(i => i.name));

		const indexName = 'createdAt_1';
		const indexExists = indexes.some(i => i.name === indexName);

		if (indexExists) {
			console.log(`Dropping index ${indexName}...`);
			await collection.dropIndex(indexName);
			console.log('Index dropped successfully.');
		} else {
			console.log(`Index ${indexName} not found.`);
		}

		process.exit(0);
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

dropIndex();
