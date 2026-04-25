import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import FormTemplate from "../models/FormTemplate.js";
import Role from "../models/Role.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the root .env file from the BackEnd directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrate = async () => {
    try {
        await connectDB();
        console.log("Connected to database. Starting migration...");

        const templates = await FormTemplate.find({});
        console.log(`Found ${templates.length} templates to process.`);

        let updatedCount = 0;

        for (const doc of templates) {
            let needsUpdate = false;
            let parsedTemplate;

            try {
                parsedTemplate = JSON.parse(doc.template);
            } catch (err) {
                console.log(`[WARN] Template ${doc._id} has invalid JSON. Skipping.`);
                continue;
            }

            let extractedRoles = [];

            if (parsedTemplate.flow && parsedTemplate.flow.nodes) {
                const startNode = parsedTemplate.flow.nodes.find((n) => n.type === 'start');
                if (startNode && startNode.data) {
                    const rawRoles = Array.isArray(startNode.data.allowedSubmitRoles)
                        ? startNode.data.allowedSubmitRoles
                        : (Array.isArray(startNode.data.allowedRoles) ? startNode.data.allowedRoles : []);

                    for (const r of rawRoles) {
                        if (/^[0-9a-fA-F]{24}$/.test(r)) {
                            extractedRoles.push(r);
                        } else {
                            const roleObj = await Role.findOne({ name: r });
                            if (roleObj) {
                                extractedRoles.push(roleObj._id.toString());
                            } else {
                                console.log(`[WARN] Role name '${r}' not found in DB for template ${doc._id}.`);
                            }
                        }
                    }
                }
            }

            // check if doc needs an update
            const currentRolesStr = (doc.allowedSubmitRoles || []).map(id => id.toString()).sort().join(',');
            const extractedRolesStr = [...extractedRoles].sort().join(',');

            if (currentRolesStr !== extractedRolesStr) {
                doc.allowedSubmitRoles = extractedRoles;
                await doc.save();
                updatedCount++;
                console.log(`[OK] Updated template ${doc._id} with roles: [${extractedRoles.join(', ')}]`);
            }
        }

        console.log(`Migration completed successfully. Updated ${updatedCount} documents.`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

migrate();
