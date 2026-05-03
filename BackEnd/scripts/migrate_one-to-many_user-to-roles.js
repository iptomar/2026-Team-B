import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

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
