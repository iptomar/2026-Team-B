import mongoose from 'mongoose';

const DraftFormTemplateSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true
	},
	template: {
		type: String,
		required: true
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	}
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// User's drafts listing with sort: find({ createdBy }).sort({ updatedAt: -1 })
DraftFormTemplateSchema.index({ createdBy: 1, updatedAt: -1 });

const DraftFormTemplate = mongoose.model('DraftFormTemplate', DraftFormTemplateSchema);

export default DraftFormTemplate;
