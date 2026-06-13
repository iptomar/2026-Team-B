import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true
	},
	description: {
		type: String
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
});

const Role = mongoose.model('Role', RoleSchema);

export default Role;
