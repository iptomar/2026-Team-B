import mongoose from 'mongoose';

const FormTemplateSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	template: {
		type: String,
		required: true
	},
	version: {
		type: Number,
		default: 1
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	templateGroupId: {
		type: String,
		required: true
	},
	replacedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'FormTemplate',
		default: null
	},
	allowedSubmitRoles: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role'
	}],
	softDelete: {
		type: Boolean,
		default: false
	}
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Active templates listing: find({ replacedBy: null, softDelete: false })
FormTemplateSchema.index({ replacedBy: 1, softDelete: 1 });

const FormTemplate = mongoose.model('FormTemplate', FormTemplateSchema);

export default FormTemplate;
