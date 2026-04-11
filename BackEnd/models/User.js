import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  // Campo para o email ou nome de utilizador (único e obrigatório)
  identificador: {
    type: String,
    required: true,
    unique: true
  },
  // Campo para a palavra-passe
  palavraPasse: {
    type: String,
    required: true
  },
  // Campo para o perfil do utilizador, estritamente validado por um Enum
  funcao: {
    type: String,
    required: true,
    enum: ['Professor', 'Administrativo', 'Limpeza', 'Administrador']
  },
  // Contador de tentativas falhadas de login para controlo de segurança
  tentativasFalhadas: {
    type: Number,
    default: 0
  },
  // Data e hora de bloqueio da conta (permitindo valores nulos)
  dataBloqueio: {
    type: Date,
    default: null
  },
  // Campo para armazenar o hash único do token de recuperação (opcional)
  recovery_token: {
    type: String,
    default: null,
    index: { unique: true, sparse: true }
  },
  // Validade do token de recuperação (opcional)
  recovery_token_expires_at: {
    type: Date,
    default: null
  }
});

// Middleware para garantir que a palavra-passe é encriptada antes de ser guardada
UserSchema.pre('save', async function (next) {
  // Apenas aplica o hash se a palavra-passe for nova ou tiver sido modificada
  if (!this.isModified('palavraPasse')) {
    return next();
  }

  try {
    // Gerar um salt e criar o hash da palavra-passe
    const saltos = await bcrypt.genSalt(10);
    this.palavraPasse = await bcrypt.hash(this.palavraPasse, saltos);
    next();
  } catch (erro) {
    next(erro);
  }
});

const User = mongoose.model('User', UserSchema);

export default User;
