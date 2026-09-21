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

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'renacred_jwt_super_secret_key_2026_x892';
    const decoded: any = jwt.verify(token, secret);

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
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token expirado ou inválido.' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores.' });
  }
  next();
};
