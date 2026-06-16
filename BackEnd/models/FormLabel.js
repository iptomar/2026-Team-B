import mongoose from 'mongoose';

const FormLabelSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	color: {
		type: String,
		default: '#3B82F6',
	}
}, { timestamps: true });

const FormLabel = mongoose.model('FormLabel', FormLabelSchema);

export default FormLabel;
