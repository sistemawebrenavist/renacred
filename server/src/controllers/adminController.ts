import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { validateIdentifier } from '../utils/cpfCnpjValidator';
import { TransactionType } from '../types/database';
import { logger } from '../utils/logger';

/**
 * Métricas do Dashboard Administrativo
 */
export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalCompanies,
      activeCompanies,
      queriesToday,
      queriesMonth,
      totalRevenueAggregate,
      recentQueries
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.query.count({ where: { createdAt: { gte: today } } }),
      prisma.query.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
      prisma.query.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { cost: true }
      }),
      prisma.query.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { razaoSocial: true, accountType: true } } }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        queriesToday,
        queriesMonth,
        totalRevenue: Number(totalRevenueAggregate._sum.cost || 0),
        recentQueries,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao obter métricas administrativas.' });
  }
};

/**
 * Listagem de Empresas / Assinantes com filtros
 */
export const listCompanies = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const accountType = req.query.accountType as any;

    const where: any = {};
    if (accountType) {
      where.accountType = accountType;
    }
    if (search) {
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { cnpjCpf: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { queries: true, apiKeys: true } }
      }
    });

    return res.json({ success: true, data: companies });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao listar empresas.' });
  }
};

/**
 * Atualização dos parâmetros comerciais da empresa
 * (Modalidade Pré/Pós-pago, Dia de Vencimento, Preço Customizado da Consulta, Limite de Crédito)
 */
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      accountType,
      billingDueDate,
      customQueryPrice,
      creditLimit,
      isActive,
      rateLimitPerMinute
    } = req.body;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const dataToUpdate: any = {};

    if (accountType !== undefined) {
      dataToUpdate.accountType = accountType === 'POST_PAID' ? 'POST_PAID' : 'PRE_PAID';
    }

    if (billingDueDate !== undefined) {
      const day = parseInt(billingDueDate, 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        dataToUpdate.billingDueDate = day;
      }
    }

    if (customQueryPrice !== undefined) {
      if (customQueryPrice === null || customQueryPrice === '') {
        dataToUpdate.customQueryPrice = null;
      } else {
        const price = parseFloat(customQueryPrice);
        if (!isNaN(price) && price >= 0) {
          dataToUpdate.customQueryPrice = price;
        }
      }
    }

    if (creditLimit !== undefined) {
      const limit = parseFloat(creditLimit);
      if (!isNaN(limit) && limit >= 0) {
        dataToUpdate.creditLimit = limit;
      }
    }

    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    }

    if (rateLimitPerMinute !== undefined) {
      const rate = parseInt(rateLimitPerMinute, 10);
      if (!isNaN(rate) && rate > 0) {
        dataToUpdate.rateLimitPerMinute = rate;
      }
    }

    const updated = await prisma.company.update({
      where: { id },
      data: dataToUpdate
    });

    logger.info(`[ADMIN] Parâmetros da empresa ${company.razaoSocial} (${id}) atualizados com sucesso.`);

    return res.json({
      success: true,
      message: 'Parâmetros comerciais atualizados com sucesso.',
      data: updated
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao atualizar empresa: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar empresa.' });
  }
};

/**
 * Ajuste manual de saldo de créditos pelo Administrador
 */
export const adjustCreditsManual = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({ success: false, message: 'Informe um valor numérico válido diferente de zero.' });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const currentBalance = Number(company.creditsBalance);
    const newBalance = currentBalance + numAmount;

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente para débito. Saldo atual: R$ ${currentBalance.toFixed(2)}.`
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: { creditsBalance: newBalance }
      });

      await tx.creditTransaction.create({
        data: {
          companyId: id,
          type: TransactionType.MANUAL_ADJUSTMENT,
          amount: Math.abs(numAmount),
          balance: newBalance,
          description: description || `Ajuste manual de saldo pelo Administrador (${numAmount > 0 ? '+' : ''}R$ ${numAmount.toFixed(2)})`,
        }
      });
    });

    logger.info(`[ADMIN] Saldo da empresa ${company.razaoSocial} ajustado em R$ ${numAmount.toFixed(2)}. Novo saldo: R$ ${newBalance.toFixed(2)}`);

    return res.json({
      success: true,
      message: 'Saldo ajustado com sucesso.',
      data: { previousBalance: currentBalance, newBalance }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao ajustar saldo.' });
  }
};

/**
 * Consulta Super Admin livre (sem custo e sem dedução de saldo)
 */
export const superAdminQuery = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ success: false, message: 'Documento é obrigatório.' });
  }

  const validation = validateIdentifier(documento);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'CPF ou CNPJ inválido.' });
  }

  try {
    const result = await fetchbrasilService.consultarHistoricoImobiliario(validation.cleaned);
    const processingTimeMs = Date.now() - startTime;

    return res.json({
      success: true,
      data: result,
      tempoProcessamentoMs: processingTimeMs,
      aviso: 'Consulta realizada no modo SuperAdmin (isenta de tarifação).'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Erro na consulta.' });
  }
};

/**
 * Auditoria de Logs da API Externa
 */
export const listApiLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          apiKey: {
            include: {
              company: { select: { razaoSocial: true, cnpjCpf: true } }
            }
          }
        }
      }),
      prisma.apiLog.count()
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar logs da API.' });
  }
};
