import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface ApiKeyRequest extends Request {
  company?: {
    id: string;
    razaoSocial: string;
    accountType: string;
  };
  apiKey?: {
    id: string;
    key: string;
    rateLimitMin: number;
  };
}

export const authenticateApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (!apiKeyHeader) {
    return res.status(401).json({
      success: false,
      code: 'API_KEY_REQUIRED',
      message: 'Cabeçalho x-api-key não fornecido. Obtenha sua chave no painel do desenvolvedor.',
    });
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: apiKeyHeader },
      include: {
        company: {
          select: {
            id: true,
            razaoSocial: true,
            accountType: true,
            isActive: true,
            rateLimitPerMinute: true,
          }
        }
      }
    });

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        message: 'Chave de API inválida, revogada ou inativa.',
      });
    }

    if (!apiKey.company.isActive) {
      return res.status(403).json({
        success: false,
        code: 'COMPANY_INACTIVE',
        message: 'A conta associada a esta chave de API está inativa ou bloqueada.',
      });
    }

    // Validação de IP Whitelist se configurado
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '';
    if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
      const isAllowed = apiKey.allowedIps.some(ip => ip.trim() === clientIp);
      if (!isAllowed) {
        logger.warn(`[API KEY] Acesso bloqueado por IP Whitelist: IP ${clientIp} tentou usar a chave ${apiKey.id}`);
        return res.status(403).json({
          success: false,
          code: 'IP_NOT_ALLOWED',
          message: `IP ${clientIp} não está autorizado para esta chave de API. Configure no painel.`,
        });
      }
    }

    // Rate limiting por minuto
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentCalls = await prisma.apiLog.count({
      where: {
        apiKeyId: apiKey.id,
        createdAt: { gte: oneMinuteAgo },
      }
    });

    const maxCalls = apiKey.rateLimitMin || apiKey.company.rateLimitPerMinute || 60;
    if (recentCalls >= maxCalls) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Limite de taxa excedido (${maxCalls} requisições por minuto). Tente novamente em alguns segundos.`,
      });
    }

    // Atualizar último uso
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalCalls: { increment: 1 }
      }
    }).catch(err => logger.error(`[API KEY] Erro ao atualizar estatísticas: ${err.message}`));

    req.company = apiKey.company;
    req.apiKey = {
      id: apiKey.id,
      key: apiKey.key,
      rateLimitMin: apiKey.rateLimitMin,
    };

    next();
  } catch (error: any) {
    logger.error(`[API KEY] Erro na validação da chave: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro interno ao validar chave de API.' });
  }
};
