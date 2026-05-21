import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	roles: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role'
	}],
	email: {
		type: String,
		required: true
	},
	avatarIcon: {
		type: String,
		default: '👤'
	},
	softDelete: {
		type: Boolean,
		default: false
	}
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Login / register lookups by email or username
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
// Flow engine: find users by role for assignee resolution
UserSchema.index({ roles: 1, softDelete: 1 });

// middleware to ensure the password is encrypted before saving
UserSchema.pre('save', async function (next) {
	// only apply hash if the password is new or has been modified
	if (!this.isModified('password')) {
		return next();
	}

	try {
		// generate a salt and create the password hash
		// 8 rounds is ~4× faster than 10 on shared Azure App Service workers
		// while still providing strong security for a university application
		const salt = await bcrypt.genSalt(8);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

const User = mongoose.model('User', UserSchema);

export default User;
