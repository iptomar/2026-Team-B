import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const NotificationSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    submissionId: mongoose.Schema.Types.ObjectId,
    type: String,
    message: String,
    read: Boolean
}, { timestamps: true });

const Notification = mongoose.model('Notification', NotificationSchema);

async function check() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/formbuilder');
    const recent = await Notification.find().sort({ createdAt: -1 }).limit(5);
    console.log(JSON.stringify(recent, null, 2));
    mongoose.disconnect();
}
check().catch(console.error);
