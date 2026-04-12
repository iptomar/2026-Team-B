import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema({
	identifier: {
		type: String,
		required: true,
	},
	successful: {
		type: Boolean,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
		// auto-delete documents after 1 hour to keep collection lean
		// mongoDB itself handles the collection cleanup
		expires: '1h',
	}
});

const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);

export default LoginAttempt;
