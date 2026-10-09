import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
    isSuperAdmin: boolean;
  };
}

// Lista de chaves JWT para rotação suave e retrocompatibilidade
const getSecretCandidates = (): string[] => {
  const primarySecret = process.env.JWT_SECRET || 'renacred_jwt_super_secret_key_2026_x892';
  const candidates = [
    primarySecret,
    'renacred_super_secret_production_key_2026_x87b1c9448102a9',
    'renacred_jwt_super_secret_key_2026_x892',
  ];
  return Array.from(new Set(candidates));
};

const verifyTokenWithFallbacks = (token: string): any => {
  const secrets = getSecretCandidates();
  let lastError: any = null;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (err: any) {
      lastError = err;
      // Se o token estiver expirado, não adianta testar com outra chave
      if (err.name === 'TokenExpiredError') {
        throw err;
      }
    }
  }

  throw lastError;
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
  }

  let decoded: any;
  try {
    decoded = verifyTokenWithFallbacks(token);
  } catch (error: any) {
    return res.status(401).json({ success: false, message: 'Token expirado ou inválido.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isSuperAdmin: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Usuário inválido ou inativo.' });
    }

    req.user = user;
    next();
  } catch (dbError: any) {
    return res.status(500).json({ success: false, message: 'Erro interno ao validar autenticação.' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores.' });
  }
  next();
};
