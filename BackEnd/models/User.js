import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  // Counter for failed login attempts for security control
  // TODO: log every login attempt and don't use this field
  failedAttempts: {
    type: Number,
    default: 0
  }
});

// middleware to ensure the password is encrypted before saving
UserSchema.pre('save', async function (next) {
  // only apply hash if the password is new or has been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // generate a salt and create the password hash
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', UserSchema);

export default User;
