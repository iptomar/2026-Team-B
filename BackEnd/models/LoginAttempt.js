import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema({
	identifier: { type: String, required: true },
	successful: { type: Boolean, required: true },
	createdAt: { type: Date, default: Date.now }
});

// query index — covers the countDocuments call in AuthController
LoginAttemptSchema.index(
	{ identifier: 1, successful: 1, createdAt: 1 },
	{ name: 'idx_login_attempts_lookup' }
);

// ensure block_window env var was loaded
const ttlSeconds = Number(process.env.FAILED_LOGIN_BLOCK_WINDOW_MINUTES) * 60;
if (isNaN(ttlSeconds) || ttlSeconds <= 0) {
	throw new Error('[LoginAttempt] Invalid or missing FAILED_LOGIN_BLOCK_WINDOW_MINUTES');
}

// TTL index — auto-deletes documents after the block window expires, clean up collection
LoginAttemptSchema.index(
	{ createdAt: 1 },
	{ expireAfterSeconds: ttlSeconds, name: 'idx_login_attempts_ttl' }
);

const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);
export default LoginAttempt;