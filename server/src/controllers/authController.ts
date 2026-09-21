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

/**
 * Atualização dos dados do perfil / configurações (Nome, E-mail, Senha)
 */
export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const updateData: any = {};

    // 1. Atualização do Nome
    if (name && typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    // 2. Atualização do E-mail
    let emailChanged = false;
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== user.email) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            id: { not: userId }
          }
        });

        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'Este e-mail já está sendo utilizado por outro usuário na plataforma.'
          });
        }

        updateData.email = cleanEmail;
        emailChanged = true;
      }
    }

    // 3. Atualização de Senha
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Para alterar a senha, é necessário informar a senha atual.'
        });
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.status(400).json({
          success: false,
          message: 'A senha atual informada está incorreta.'
        });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'A nova senha deve possuir no mínimo 6 caracteres.'
        });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado informado para alteração.'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { company: true }
    });

    // Se o e-mail mudou, gerar um novo token JWT atualizado
    const token = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        companyId: updatedUser.companyId,
        isSuperAdmin: updatedUser.isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`[AUTH] Perfil do usuário ${updatedUser.name} (${updatedUser.id}) atualizado com sucesso.`);

    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso!',
      data: {
        token,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isSuperAdmin: updatedUser.isSuperAdmin,
          company: {
            id: updatedUser.company.id,
            razaoSocial: updatedUser.company.razaoSocial,
            cnpjCpf: updatedUser.company.cnpjCpf,
            accountType: updatedUser.company.accountType,
            creditsBalance: Number(updatedUser.company.creditsBalance),
            creditLimit: Number(updatedUser.company.creditLimit),
            billingDueDate: updatedUser.company.billingDueDate,
          }
        }
      }
    });
  } catch (error: any) {
    logger.error(`[AUTH] Erro ao atualizar perfil: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar dados do perfil.' });
  }
};

/**
 * Atualização dos dados cadastrais de contato e endereço da Empresa (Assinante)
 */
export const updateCompanyContact = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const { nomeFantasia, telefone, endereco, cidade, estado, cep } = req.body;

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        nomeFantasia: typeof nomeFantasia === 'string' ? nomeFantasia.trim() || null : company.nomeFantasia,
        telefone: typeof telefone === 'string' ? telefone.trim() || null : company.telefone,
        endereco: typeof endereco === 'string' ? endereco.trim() || null : company.endereco,
        cidade: typeof cidade === 'string' ? cidade.trim() || null : company.cidade,
        estado: typeof estado === 'string' ? estado.trim().toUpperCase() || null : company.estado,
        cep: typeof cep === 'string' ? cep.replace(/\D/g, '') || null : company.cep,
      }
    });

    logger.info(`[AUTH] Dados de contato da empresa ${updatedCompany.razaoSocial} (${companyId}) atualizados.`);

    return res.json({
      success: true,
      message: 'Dados cadastrais da empresa atualizados com sucesso!',
      data: updatedCompany
    });
  } catch (error: any) {
    logger.error(`[AUTH] Erro ao atualizar dados da empresa: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar dados cadastrais.' });
  }
};


