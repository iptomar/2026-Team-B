import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema({
	token: {
		type: String,
		required: true,
		unique: true,
	},
	userId: {
		type: String, // string instead of ObjectId because User _id was manually changed to String by user
		ref: 'User',
		required: true,
	},
	expiresAt: {
		type: Date,
		required: true,
		// auto-delete documents after 1 hour to keep collection lean
		// mongoDB itself handles the collection cleanup
		expires: 0 // will auto delete when expiresAt date is reached
	}
});

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);

export default RefreshToken;
