import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { validateIdentifier } from '../utils/cpfCnpjValidator';
import { TransactionType } from '../types/database';
import { logger } from '../utils/logger';

/**
 * Cadastro completo de nova Empresa / Assinante e seu Administrador inicial
 */
export const createCompany = async (req: Request, res: Response) => {
  try {
    const {
      cnpjCpf,
      razaoSocial,
      nomeFantasia,
      email,
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      accountType,
      billingDueDate,
      customQueryPrice,
      creditLimit,
      initialBalance,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!cnpjCpf || !razaoSocial || !email) {
      return res.status(400).json({ success: false, message: 'CNPJ/CPF, Razão Social e E-mail da empresa são obrigatórios.' });
    }

    if (!adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'E-mail e senha do usuário administrador inicial são obrigatórios.' });
    }

    const cleanDoc = cnpjCpf.replace(/\D/g, '');
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { cnpjCpf: cleanDoc },
          { email: email.toLowerCase().trim() }
        ]
      }
    });

    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'Já existe uma empresa cadastrada com este CNPJ/CPF ou E-mail.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Já existe um usuário cadastrado com este e-mail de acesso.' });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const balanceNum = parseFloat(initialBalance) || 0;
    const limitNum = parseFloat(creditLimit) || 0;
    const customPriceNum = customQueryPrice ? parseFloat(customQueryPrice) : null;
    const dueDateNum = parseInt(billingDueDate, 10) || 10;

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          cnpjCpf: cleanDoc,
          razaoSocial,
          nomeFantasia: nomeFantasia || null,
          email: email.toLowerCase().trim(),
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          accountType: accountType === 'POST_PAID' ? 'POST_PAID' : 'PRE_PAID',
          creditsBalance: balanceNum,
          creditLimit: limitNum,
          billingDueDate: dueDateNum,
          customQueryPrice: customPriceNum,
        }
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: adminName || razaoSocial,
          email: adminEmail.toLowerCase().trim(),
          password: hashedPassword,
          role: 'COMPANY_ADMIN',
          isSuperAdmin: false,
        }
      });

      if (balanceNum > 0) {
        await tx.creditTransaction.create({
          data: {
            companyId: company.id,
            type: TransactionType.RECHARGE,
            amount: balanceNum,
            balance: balanceNum,
            description: 'Saldo inicial concedido no cadastro da empresa.',
          }
        });
      }

      return { company, user };
    });

    logger.info(`[ADMIN] Nova empresa cadastrada: ${razaoSocial} (${cleanDoc}) com usuário ${adminEmail}`);

    return res.status(201).json({
      success: true,
      message: 'Empresa e usuário administrador cadastrados com sucesso!',
      data: {
        companyId: result.company.id,
        razaoSocial: result.company.razaoSocial,
        cnpjCpf: result.company.cnpjCpf,
        accountType: result.company.accountType,
        adminUser: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        }
      }
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao cadastrar empresa: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro interno ao cadastrar empresa.' });
  }
};

/**
 * Exclusão / Remoção de empresa pelo Administrador
 */
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const superAdminInCompany = await prisma.user.findFirst({
      where: { companyId: id, isSuperAdmin: true }
    });

    if (superAdminInCompany) {
      return res.status(403).json({ success: false, message: 'Não é permitido excluir a empresa controladora do Super Admin.' });
    }

    await prisma.company.delete({ where: { id } });

    logger.info(`[ADMIN] Empresa ${company.razaoSocial} (${id}) excluída com sucesso.`);

    return res.json({ success: true, message: 'Empresa removida com sucesso.' });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao excluir empresa: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao excluir empresa.' });
  }
};

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
      prisma.query.count({
        where: {
          createdAt: { gte: today },
          source: 'API',
          status: 'COMPLETED'
        }
      }),
      prisma.query.count({
        where: {
          createdAt: { gte: firstDayOfMonth },
          source: 'API',
          status: 'COMPLETED'
        }
      }),
      prisma.query.aggregate({
        where: { status: 'COMPLETED', source: 'API' },
        _sum: { cost: true }
      }),
      prisma.query.findMany({
        where: {
          source: 'API' // Apenas consultas efetuadas pelas APIs dos clientes
        },
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpjCpf: true,
              accountType: true
            }
          }
        }
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
        _count: { select: { queries: true, apiKeys: true } },
        apiKeys: {
          select: {
            id: true,
            name: true,
            key: true,
            isActive: true,
            totalCalls: true,
            lastUsedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        }
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
    logger.error(`[ADMIN] Erro na consulta super admin: ${error.message}`);
    const isProviderBlocked = error.message && error.message.includes('403');
    const userMessage = isProviderBlocked
      ? 'O provedor de dados cartorários (FetchBrasil) bloqueou o acesso deste servidor (HTTP 403 Cloudflare). Verifique a liberação do IP 209.50.245.165 no painel da FetchBrasil.'
      : (error.message || 'Erro na consulta.');

    return res.status(500).json({
      success: false,
      code: isProviderBlocked ? 'PROVIDER_BLOCKED_403' : 'QUERY_ERROR',
      message: userMessage
    });
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

/**
 * Gerar nova chave de API para uma empresa (Admin)
 */
export const createApiKeyForCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const randomSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = `rena_live_${randomSecret}`;

    const newKey = await prisma.apiKey.create({
      data: {
        companyId: id,
        name: name || `Chave ${company.razaoSocial}`,
        key: fullKey,
        rateLimitMin: 60,
      }
    });

    return res.json({
      success: true,
      data: newKey,
      message: 'Chave de API gerada com sucesso para o cliente.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao gerar chave de API.' });
  }
};

/**
 * Revogar chave de API de uma empresa (Admin)
 */
export const revokeApiKeyAdmin = async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false }
    });

    return res.json({ success: true, message: 'Chave de API desativada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao desativar chave de API.' });
  }
};
