import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables before doing anything else
dotenv.config({ path: path.join(__dirname, '../.env') });

import { uploadBlob } from '../services/blobService.js';
// @ts-ignore
import User from '../models/User.js';

async function migrateAvatars() {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is missing.');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB.');

        // Find users whose avatarIcon starts with 'data:image'
        const users = await User.find({ avatarIcon: { $regex: /^data:image/ } });
        console.log(`Found ${users.length} users with base64 avatars.`);

        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'bug-reports';

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            console.log(`Migrating avatar for user ${user._id} (${user.username})...`);
            try {
                const match = user.avatarIcon.match(/^data:(image\/\w+);base64,(.+)$/);
                if (match) {
                    const mimeType = match[1];
                    const base64Data = match[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    // Basic extension mapping from mime type
                    let ext = '.jpg';
                    if (mimeType.includes('png')) ext = '.png';
                    else if (mimeType.includes('gif')) ext = '.gif';
                    else if (mimeType.includes('webp')) ext = '.webp';

                    const blobName = `avatars/${user._id}/${crypto.randomUUID()}${ext}`;

                    await uploadBlob(containerName, blobName, buffer, mimeType);
                    
                    user.avatarIcon = blobName;
                    await user.save();
                    console.log(`  -> Successfully migrated to ${blobName}`);
                    successCount++;
                } else {
                    console.warn(`  -> Could not parse data URI for user ${user._id}`);
                    failCount++;
                }
            } catch (err) {
                console.error(`  -> Failed to migrate avatar for user ${user._id}:`, err);
                failCount++;
            }
        }
        
        console.log(`\nMigration complete. Success: ${successCount}, Failures: ${failCount}`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

migrateAvatars();
