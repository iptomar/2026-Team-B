import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
/**
 * Database migration script to convert user role fields from single role to multiple roles.
 * 
 * SCHEMA CHANGE:
 * - BEFORE: Users had a single 'role' field (one-to-one relationship)
 * - AFTER:  Users have a 'roles' array field (one-to-many relationship)
 * 
 * WHY THIS MIGRATION:
 * The application evolved from allowing users to have only one role (e.g., 'student')
 * to supporting multiple roles per user (e.g., 'student' AND 'monitor').
 * This migration transforms existing data to match the new schema.
 * 
* 
 * EXAMPLE TRANSFORMATION:
 * 
 * Before migration:
 * {
 *   "_id": ObjectId("..."),
 *   "username": "john_doe",
 *   "role": "student",
 *   "email": "john@example.com"
 * }
 * 
 * After migration:
 * {
 *   "_id": ObjectId("..."),
 *   "username": "john_doe",
 *   "roles": ["student"],  // Converted to array
 *   "email": "john@example.com"
 * }
 * 
 * NOTE: The old 'role' field is removed (unset) after migration.
 */
async function migrate() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log('Connected to MongoDB');

		const db = mongoose.connection.db;
		const usersCollection = db.collection('users');

		// Find users where 'role' field exists
		const users = await usersCollection.find({ role: { $exists: true } }).toArray();
		console.log(`Found ${users.length} users to migrate.`);

		let count = 0;
		for (const user of users) {
			if (user.role) {
				await usersCollection.updateOne(
					{ _id: user._id },
					{
						$set: { roles: [user.role] },
						$unset: { role: "" }
					}
				);
				count++;
			}
		}

		console.log(`Successfully migrated ${count} users.`);
		process.exit(0);
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	}
}

migrate();
