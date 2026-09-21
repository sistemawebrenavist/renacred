import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';

/**
 * Listar chaves de API da empresa logada
 */
export const listApiKeys = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const keys = await prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        allowedIps: true,
        rateLimitMin: true,
        totalCalls: true,
        lastUsedAt: true,
        isActive: true,
        createdAt: true,
      }
    });

    return res.json({ success: true, data: keys });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao listar chaves de API.' });
  }
};

/**
 * Criar nova chave de API
 */
export const createApiKey = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const { name, allowedIps, rateLimitMin } = req.body;

    const randomSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = `rena_live_${randomSecret}`;

    const newKey = await prisma.apiKey.create({
      data: {
        companyId,
        name: name || 'Integração API Renacred',
        key: fullKey,
        allowedIps: Array.isArray(allowedIps) ? allowedIps : [],
        rateLimitMin: rateLimitMin ? parseInt(rateLimitMin, 10) : 60,
      }
    });

    return res.json({
      success: true,
      data: newKey,
      message: 'Chave de API gerada com sucesso.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao gerar chave de API.' });
  }
};

/**
 * Revogar / Desativar chave de API
 */
export const revokeApiKey = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, companyId }
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'Chave de API não encontrada.' });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({ success: true, message: 'Chave de API revogada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao revogar chave de API.' });
  }
};
