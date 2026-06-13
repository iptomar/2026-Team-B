import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rgCras:imagensbase64!@docdb-cluster-20260609-2238.global.mongocluster.cosmos.azure.com/gp?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000';

const FormSubmissionSchema = new mongoose.Schema({}, { strict: false });
const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

function extractValues(layout) {
	const values = {};

	function walk(rows) {
		if (!Array.isArray(rows)) return;
		for (const row of rows) {
			if (!Array.isArray(row.columns)) continue;
			for (const col of row.columns) {
				const field = col.field;
				if (!field) continue;

				if (field.submittedValue !== undefined) {
					values[field.id] = field.submittedValue;
				}

				if (field.type === 'group' && Array.isArray(field.children)) {
					walk(field.children);
				}
			}
		}
	}

	walk(layout);
	return values;
}

async function migrate() {
	try {
		console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
		await mongoose.connect(MONGODB_URI);
		console.log('Connected to MongoDB.');

		const submissions = await FormSubmission.find({ submittedData: { $exists: true } });
		console.log(`Found ${submissions.length} submissions to migrate.`);

		const bulkOps = [];

		for (const sub of submissions) {
			try {
				const submittedDataStr = sub.get('submittedData');
				if (!submittedDataStr) continue;

				const parsedData = JSON.parse(submittedDataStr);
				const values = extractValues(parsedData.layout || []);

				bulkOps.push({
					updateOne: {
						filter: { _id: sub._id },
						update: {
							$set: { submittedValues: values },
							$unset: { submittedData: "" }
						}
					}
				});
			} catch (err) {
				console.error(`Error parsing submittedData for submission ${sub._id}:`, err.message);
			}
		}

		if (bulkOps.length > 0) {
			const result = await FormSubmission.collection.bulkWrite(bulkOps);
			console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
		} else {
			console.log('No documents needed migration.');
		}

	} catch (err) {
		console.error('Migration failed:', err);
	} finally {
		await mongoose.disconnect();
		console.log('Disconnected from MongoDB.');
	}
}

migrate();
