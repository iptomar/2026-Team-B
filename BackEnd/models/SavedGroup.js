import mongoose from 'mongoose';

const SavedGroupSchema = new mongoose.Schema({
	label: {
		type: String,
		required: true,
		unique: true
	},
	content: {
		type: String,
		required: true
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		default: null
	}
}, { timestamps: true });

const SavedGroup = mongoose.model('SavedGroup', SavedGroupSchema);

export default SavedGroup;
