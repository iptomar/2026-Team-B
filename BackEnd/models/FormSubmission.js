import mongoose from 'mongoose';

const FormSubmissionSchema = new mongoose.Schema({
	templateId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'FormTemplate',
		required: true
	},
	submitterId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	submittedData: {
		type: String,
		required: true
	},
	status: {
		type: String,
		default: 'submitted'
	}
}, { timestamps: true });

const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

export default FormSubmission;
