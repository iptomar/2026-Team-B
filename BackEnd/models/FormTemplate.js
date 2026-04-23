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
	softDelete: {
		type: Boolean,
		default: false
	}
}, { timestamps: true });

const FormTemplate = mongoose.model('FormTemplate', FormTemplateSchema);

export default FormTemplate;
