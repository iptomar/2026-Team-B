import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  // Contador de tentativas falhadas de login para controlo de segurança
  failedAttempts: {
    type: Number,
    default: 0,
  },
  // Data e hora de bloqueio da conta (permitindo valores nulos)
  lockedUntil: {
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

// Middleware para garantir que a palavra-passe é encriptada antes de ser guardada
UserSchema.pre("save", async function (next) {
  // Apenas aplica o hash se a palavra-passe for nova ou tiver sido modificada
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
