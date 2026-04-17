import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dropIndices = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        console.log("Dropping old index 'identificador_1' on users collection...");
        try {
            await mongoose.connection.collection('users').dropIndex('identificador_1');
            console.log("Successfully dropped 'identificador_1' index.");
        } catch (err) {
            if (err.code === 27) {
                console.log("Index 'identificador_1' does not exist, skipping.");
            } else {
                console.log("Error dropping identificador_1:", err.message);
            }
        }
        
        console.log("Syncing indexes for User model (creating new ones for username and email)...");
        // We import user dynamically so models are registered after connection
        const User = (await import('../models/User.js')).default;
        await User.syncIndexes();
        console.log("SyncIndexes completed successfully.");
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

dropIndices();
