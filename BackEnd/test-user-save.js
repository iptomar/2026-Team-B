import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const user = new User({
            username: 'test_sso_user@example.com',
            email: 'test_sso_user@example.com',
            authProvider: 'azure-ad'
        });
        await user.save();
        console.log("User saved successfully without password.");
        await User.deleteOne({ email: 'test_sso_user@example.com' });
    } catch (err) {
        console.error("Error saving user:", err);
    }
    await mongoose.disconnect();
}
run();
