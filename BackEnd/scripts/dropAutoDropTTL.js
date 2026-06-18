import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
// MongoDB connection string (hardcoded - contains credentials)
// WARNING: Hardcoded credentials in source code is a security risk!
// In production, this should be loaded from environment variables like the other scripts.

const MONGO_URI = process.env.MONGO_URI;
/**
 * Database migration script to drop a TTL (Time-To-Live) index from the ApprovalEvents collection.
 * 
 * TTL indexes in MongoDB automatically delete documents after a certain age.
 * This script removes the 'createdAt_1' TTL index from the 'approvalevents' collection,
 * which would have been automatically expiring old approval event records.
 * 
 * Use case: The application previously had an auto-expiration policy for approval events
 * (e.g., delete events older than 30 days), but this policy is being removed.
 * Now approval events will be kept indefinitely for audit/compliance purposes.
 */
async function dropIndex() {
	try {
		// Connect to MongoDB Atlas/Cosmos DB cluster
		// NOTE: Hardcoded connection string - this should be moved to .env file for security
		await mongoose.connect("mongodb+srv://rute:Imagensbase64@clustergpform.global.mongocluster.cosmos.azure.com/gp?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000");
		console.log('Connected to MongoDB');
		// Get direct access to the database and collection

		const db = mongoose.connection.db;
		const collection = db.collection('approvalevents');
		// List all existing indexes on the approvalevents collection

		const indexes = await collection.indexes();
		console.log('Current indexes:', indexes.map(i => i.name));
		// Check if the TTL index named 'createdAt_1' exists

		const indexName = 'createdAt_1';
		const indexExists = indexes.some(i => i.name === indexName);

		if (indexExists) {
						// Drop the TTL index - this will stop automatic document deletion

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
