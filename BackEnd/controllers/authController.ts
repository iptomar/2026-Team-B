import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Model Mongoose existente no projeto

/**
 * Endpoint de Login do IPT
 * 
 * Este endpoint lida com a autenticação de utilizadores, incluindo sanitização, 
 * validação de domínio IPT, verificação de password encriptada com bcrypt e geração de JWT.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extração de dados da requisição
    let { email, password } = req.body;

    // 2. Segurança: Proteção básica (validação de campos não fornecidos)
    if (!email || !password) {
      res.status(400).json({ error: 'O e-mail e a palavra-passe são obrigatórios.' });
      return;
    }

    // Segurança: Sanitização básica de inputs
    email = String(email).trim().toLowerCase();
    password = String(password).trim();

    // 3. Validação de Domínio: Garantir que apenas e-mails do @ipt.pt são permitidos
    if (!email.endsWith('@ipt.pt')) {
      res.status(403).json({ error: 'Apenas são permitidos e-mails institucionais do IPT.' });
      return;
    }

    // 4. Procurar utilizador usando o modelo (O utilizador é guardado no campo 'identificador')
    const user = await User.findOne({ identificador: email });

    if (!user) {
      // É recomendado retornar 401 sem especificar se foi o e-mail ou a password a falhar (Security best practice)
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    // 5. Verificação de Credenciais: Comparar a password fornecida com a hash gerada pelo bcrypt no DB
    const isPasswordValid = await bcrypt.compare(password, user.palavraPasse);

    if (!isPasswordValid) {
      // 401 Unauthorized para passwords incorretas
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    // 6. Resposta: Geração do token JWT de autenticação
    const jwtSecret = process.env.JWT_SECRET || 'segredo_em_ambiente_dev'; // JWT Secret mock/fallback para uso imediato
    const token = jwt.sign(
      {
        id: user._id,
        email: user.identificador,
        funcao: user.funcao
      },
      jwtSecret,
      { expiresIn: '2h' } // Token expira em 2 horas
    );

    // Retorna 200 OK com o Token JWT e os dados não-sensíveis do user
    res.status(200).json({
      message: 'Autenticação realizada com sucesso.',
      token,
      user: {
        id: user._id,
        email: user.identificador,
        funcao: user.funcao
      }
    });

  } catch (error) {
    console.error('Erro no servidor durante o login:', error);
    // Erros não previstos do servidor
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
};
