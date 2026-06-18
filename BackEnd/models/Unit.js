import mongoose from 'mongoose';

const UnitSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	description: {
		type: String,
		default: ''
	},
	softDelete: {
		type: Boolean,
		default: false
	},
	translations: {
		type: Map,
		of: String,
		default: {}
	}
}, { timestamps: true });

const Unit = mongoose.model('Unit', UnitSchema);

export default Unit;
