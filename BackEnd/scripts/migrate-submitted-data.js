import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory path (ES modules equivalent of __dirname)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from .env file

dotenv.config({ path: path.join(__dirname, '../.env') });
// MongoDB connection URI (with fallback hardcoded value)
// WARNING: Hardcoded credentials should be moved to .env for security
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rgCras:imagensbase64!@docdb-cluster-20260609-2238.global.mongocluster.cosmos.azure.com/gp?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000';

const FormSubmissionSchema = new mongoose.Schema({}, { strict: false });
const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);
/**
 * Extracts submitted values from a form layout structure.
 * Recursively traverses the layout tree to find all fields with submittedValue.
 * 
 * @param layout - The form layout array containing rows, columns, and fields
 * @returns Object mapping field IDs to their submitted values
 * 
 * BEFORE: Form data was stored as a complex nested JSON structure (layout)
 * AFTER:  Form data is stored as a simple key-value object (fieldId → value)
 * 
 * Example input layout:
 * [
 *   {
 *     columns: [
 *       {
 *         field: {
 *           id: "name",
 *           type: "text",
 *           submittedValue: "John Doe"
 * *         }
 *       },
 *       {
 *         field: {
 *           id: "age",
 *           type: "number",
 *           submittedValue: 25
 *         }
 *       }
 *     ]
 *   }
 * ]
 * 
 * Example output:
 * {
 *   "name": "John Doe",
 *   "age": 25
 * }
 */
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

/**
 * Main migration function.
 * 
 * SCHEMA CHANGE:
 * - BEFORE: Form submissions stored data in 'submittedData' field as a complex JSON string
 *          containing the entire layout structure with embedded values
 * - AFTER:  Form submissions store data in 'submittedValues' field as a simple flat object
 *          mapping field IDs directly to values
 * 
 * WHY THIS MIGRATION:
 * - Performance: Querying specific field values requires parsing the entire layout
 * - Simplicity: Frontend can directly access values without traversing the layout tree
 * - Indexing: Flat objects allow indexing on specific field values for search/filtering
 * - Storage efficiency: Reduces duplication of layout structure for each submission
 * 
 * EXAMPLE TRANSFORMATION:
 * 
 * Before:
 * {
 *   "submittedData": "{\"layout\":[{\"columns\":[{\"field\":{\"id\":\"name\",\"submittedValue\":\"John\"}}]}]}"
 * }
 * 
 * * After:
 * {
 *   "submittedValues": { "name": "John" },
 *   // submittedData field is removed
 * }
 */
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
