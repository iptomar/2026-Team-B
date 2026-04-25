import mongoose from 'mongoose';

const FormSubmissionSchema = new mongoose.Schema({
	templateId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'FormTemplate',
		required: true,
		index: true            // speeds up template-based lookups
	},
	submitterId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true            // speeds up all per-user queries
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

// Compound index matching the sort used in GET /formSubmissions/my
// { submitterId: 1, createdAt: -1 } lets MongoDB satisfy both
// the equality filter and the descending sort in a single index scan.
FormSubmissionSchema.index({ submitterId: 1, createdAt: -1 });

const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

export default FormSubmission;

