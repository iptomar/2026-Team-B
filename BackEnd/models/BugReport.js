import mongoose from 'mongoose';

const BugReportSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	attachments: [{
		originalName: String,
		blobName: String,
		containerName: String,
		contentType: String,
		size: Number
	}],
	createdAt: {
		type: Date,
		default: Date.now
	},
	status: {
		type: String,
		enum: ['pending', 'resolved'],
		default: 'pending'
	}
});

const BugReport = mongoose.model('BugReport', BugReportSchema);

export default BugReport;
