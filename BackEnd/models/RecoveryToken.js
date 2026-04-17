import mongoose from 'mongoose';

const RecoveryTokenSchema = new mongoose.Schema({
	token: {
		type: String,
		required: true,
		unique: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		index: true
	},
	expiresAt: {
		type: Date,
		required: true,
		expires: 0
	}
});

const RecoveryToken = mongoose.model('RecoveryToken', RecoveryTokenSchema);

export default RecoveryToken;
