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

const DraftFormTemplate = mongoose.model('DraftFormTemplate', DraftFormTemplateSchema);

export default DraftFormTemplate;
