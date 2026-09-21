import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'renacred_jwt_super_secret_key_2026_x892';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { company: true }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    if (!user.isActive || !user.company.isActive) {
      return res.status(403).json({ success: false, message: 'Conta inativa ou bloqueada.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        isSuperAdmin: user.isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          company: {
            id: user.company.id,
            razaoSocial: user.company.razaoSocial,
            cnpjCpf: user.company.cnpjCpf,
            accountType: user.company.accountType,
            creditsBalance: Number(user.company.creditsBalance),
            creditLimit: Number(user.company.creditLimit),
            billingDueDate: user.company.billingDueDate,
          }
        }
      }
    });
  } catch (error: any) {
    logger.error(`[AUTH] Erro no login: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        company: {
          id: user.company.id,
          razaoSocial: user.company.razaoSocial,
          cnpjCpf: user.company.cnpjCpf,
          accountType: user.company.accountType,
          creditsBalance: Number(user.company.creditsBalance),
          creditLimit: Number(user.company.creditLimit),
          billingDueDate: user.company.billingDueDate,
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar perfil.' });
  }
};
