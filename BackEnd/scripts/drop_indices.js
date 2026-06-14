import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current file's directory path (ES modules equivalent of __dirname)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the parent directory

dotenv.config({ path: path.join(__dirname, '../.env') });
/**
 * Database migration script to drop an old index and sync new indexes.
 * 
 * This script is typically run during database schema migrations when:
 * - An old index is no longer needed (e.g., 'identificador_1' index on users collection)
 * - New indexes need to be created after model changes
 * 
 * Use case: The application previously used an index named 'identificador_1'
 * but now uses different indexes for username and email fields. This script
 * cleans up the old index to keep the database optimized.
 */
const dropIndices = async () => {
	try {
				// Connect to MongoDB using URI from environment variables

		await mongoose.connect(process.env.MONGO_URI);

		console.log("Connected to DB.");
				// ─── Drop Old Index ─────────────────────────────────────────────────

		console.log("Dropping old index 'identificador_1' on users collection...");
		try {
						// Attempt to remove the obsolete index by name

			await mongoose.connection.collection('users').dropIndex('identificador_1');
			console.log("Successfully dropped 'identificador_1' index.");
		} catch (err) {
						// Error code 27 means "IndexNotFound" - which is acceptable

			if (err.code === 27) {
				console.log("Index 'identificador_1' does not exist, skipping.");
			} else {
								// Other errors (like permission issues) should be logged

				console.log("Error dropping identificador_1:", err.message);
			}
		}
		// ─── Sync New Indexes ─────────────────────────────────────────────

		console.log("Syncing indexes for User model (creating new ones for username and email)...");
		// We import user dynamically so models are registered after connection
		const User = (await import('../models/User.js')).default;
		// syncIndexes() compares the indexes defined in the User model schema
		// with what actually exists in the database and:
		// - Creates any missing indexes
		// - Drops any indexes that exist in DB but not in schema
		// - Updates index options if they've changed
		await User.syncIndexes();
		console.log("SyncIndexes completed successfully.");

		process.exit(0);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
};

dropIndices();
