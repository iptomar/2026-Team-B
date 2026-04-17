import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  // Field for the username (unique and required)
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // Field for the email (unique and required)
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // Field for the password
  password: {
    type: String,
    required: true,
  },
  // Field for the user's role, referencing the Role model
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  // Counter for failed login attempts for security control
  failedAttempts: {
    type: Number,
    default: 0,
  },
  // Date and time until the account is locked (allowing null values)
  lockUntil: {
    type: Date,
    default: null,
  },
  // Campo para armazenar o hash único do token de recuperação (opcional)
  recovery_token: {
    type: String,
    default: null,
    index: { unique: true, sparse: true },
  },
  // Validade do token de recuperação (opcional)
  recovery_token_expires_at: {
    type: Date,
    default: null,
  },
});

// Middleware to ensure the password is encrypted before saving
UserSchema.pre("save", async function (next) {
  // Only apply hash if the password is new or has been modified
  if (!this.isModified("password")) {
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

const User = mongoose.model("User", UserSchema);

export default User;
