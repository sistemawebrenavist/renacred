import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { validateIdentifier } from '../utils/cpfCnpjValidator';
import { TransactionType, InvoiceStatus } from '../types/database';
import { logger } from '../utils/logger';
import { productPricingService } from '../services/productPricing.service';

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
      allowedProducts,
      customPrices
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
          allowedProducts: Array.isArray(allowedProducts) && allowedProducts.length > 0 ? allowedProducts : ['ALL'],
          customPrices: typeof customPrices === 'object' && customPrices !== null ? customPrices : null,
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

      // Gerar chave de API inicial da empresa automaticamente
      const randomSecret = crypto.randomBytes(24).toString('hex');
      const initialApiKey = `rena_live_${randomSecret}`;
      const apiKey = await tx.apiKey.create({
        data: {
          companyId: company.id,
          name: `Chave Produção - ${razaoSocial}`,
          key: initialApiKey,
          rateLimitMin: 60,
          isActive: true,
          allowedProducts: company.allowedProducts || ['ALL'],
        }
      });

      return { company, user, apiKey };
    });

    logger.info(`[ADMIN] Nova empresa cadastrada: ${razaoSocial} (${cleanDoc}) com chave ${result.apiKey.key}`);

    return res.status(201).json({
      success: true,
      message: 'Empresa, usuário administrador e chave de API cadastrados com sucesso!',
      data: {
        companyId: result.company.id,
        razaoSocial: result.company.razaoSocial,
        cnpjCpf: result.company.cnpjCpf,
        accountType: result.company.accountType,
        apiKey: result.apiKey.key,
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

    const isClientCompany = {
      users: {
        none: { isSuperAdmin: true }
      }
    };

    const [
      totalCompanies,
      activeCompanies,
      queriesToday,
      queriesMonth,
      totalRevenueAggregate,
      recentQueries
    ] = await Promise.all([
      prisma.company.count({
        where: isClientCompany
      }),
      prisma.company.count({
        where: {
          isActive: true,
          ...isClientCompany
        }
      }),
      prisma.query.count({
        where: {
          createdAt: { gte: today },
          source: 'API',
          status: 'COMPLETED',
          company: isClientCompany
        }
      }),
      prisma.query.count({
        where: {
          createdAt: { gte: firstDayOfMonth },
          source: 'API',
          status: 'COMPLETED',
          company: isClientCompany
        }
      }),
      prisma.query.aggregate({
        where: {
          status: 'COMPLETED',
          source: 'API',
          company: isClientCompany
        },
        _sum: { cost: true }
      }),
      prisma.query.findMany({
        where: {
          source: 'API', // Apenas consultas efetuadas pelas APIs dos clientes
          company: isClientCompany
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
      where.AND = [
        {
          OR: [
            { razaoSocial: { contains: search, mode: 'insensitive' } },
            { cnpjCpf: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        }
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
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' }
        },
        invoices: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            totalAmount: true,
            totalQueries: true,
            cycleStart: true,
            cycleEnd: true,
            dueDate: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const formattedCompanies = companies.map((c) => {
      const customPrices = (c.customPrices as any) || {};
      const isMasterAdmin = c.cnpjCpf === '00000000000191' ||
                           c.razaoSocial?.toLowerCase().includes('renacred') ||
                           Number(c.creditLimit) >= 999999 ||
                           Boolean(customPrices.isUnlimited);
      return {
        ...c,
        isMasterAdmin,
        invoices: isMasterAdmin ? [] : c.invoices,
      };
    });

    return res.json({ success: true, data: formattedCompanies });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao listar empresas.' });
  }
};

/**
 * Atualização dos parâmetros comerciais da empresa
 * (Modalidade Pré/Pós-pago/Ilimitada, Dia de Vencimento, Preço Customizado da Consulta, Limite de Crédito e Requisições)
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
      rateLimitPerMinute,
      allowedProducts,
      customPrices,
      monthlyRequestLimit,
      isUnlimited
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

    if (isUnlimited !== undefined && Boolean(isUnlimited)) {
      dataToUpdate.creditLimit = 999999;
      // Cancela/remove faturas abertas para conta matriz/administradora
      await prisma.invoice.deleteMany({
        where: { companyId: id, status: InvoiceStatus.OPEN }
      });
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

    if (allowedProducts !== undefined) {
      dataToUpdate.allowedProducts = Array.isArray(allowedProducts) && allowedProducts.length > 0
        ? allowedProducts
        : ['ALL'];
    }

    if (customPrices !== undefined || isUnlimited !== undefined || monthlyRequestLimit !== undefined) {
      const basePrices: Record<string, any> = typeof customPrices === 'object' && customPrices !== null
        ? { ...customPrices }
        : ((company.customPrices as any) ? { ...(company.customPrices as any) } : {});

      if (isUnlimited !== undefined) {
        basePrices.isUnlimited = Boolean(isUnlimited);
      }
      if (monthlyRequestLimit !== undefined) {
        const reqLimit = parseInt(monthlyRequestLimit, 10);
        basePrices.monthlyRequestLimit = !isNaN(reqLimit) && reqLimit > 0 ? reqLimit : null;
      }
      dataToUpdate.customPrices = Object.keys(basePrices).length > 0 ? basePrices : null;
    }

    const updated = await prisma.company.update({
      where: { id },
      data: dataToUpdate
    });

    // Sincronizar todas as chaves de API existentes da empresa com os produtos permitidos atualizados
    if (dataToUpdate.allowedProducts) {
      await prisma.apiKey.updateMany({
        where: { companyId: id },
        data: { allowedProducts: dataToUpdate.allowedProducts }
      });
      logger.info(`[ADMIN] Chaves de API da empresa ${company.razaoSocial} sincronizadas com allowedProducts: ${JSON.stringify(dataToUpdate.allowedProducts)}`);
    }

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
    const { amount, description, targetField } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({ success: false, message: 'Informe um valor numérico válido diferente de zero.' });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    // Se a alteração for no Limite de Crédito (típico de Pós-pago)
    if (targetField === 'creditLimit') {
      const newLimit = Math.max(0, numAmount);
      await prisma.company.update({
        where: { id },
        data: { creditLimit: newLimit }
      });

      logger.info(`[ADMIN] Limite de crédito da empresa ${company.razaoSocial} ajustado para R$ ${newLimit.toFixed(2)}`);

      return res.json({
        success: true,
        message: `Limite de crédito pós-pago atualizado para R$ ${newLimit.toFixed(2)}.`,
        data: { previousLimit: Number(company.creditLimit || 0), newLimit }
      });
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
 * Recupera o laudo e a resposta exata da consulta vinculada a um log de API
 */
export const getLogQueryResponse = async (req: Request, res: Response) => {
  try {
    const { logId, identifier, companyId } = req.query as {
      logId?: string;
      identifier?: string;
      companyId?: string;
    };

    let targetIdentifier = identifier ? String(identifier).trim() : '';
    let targetCompanyId = companyId;

    if (logId) {
      const log = await prisma.apiLog.findUnique({
        where: { id: logId }
      });
      if (log) {
        if (!targetCompanyId) targetCompanyId = log.companyId;
        if (!targetIdentifier) {
          const match = log.endpoint.match(/[?&](?:query|q|documento|parametro|doc|placa)=([^&]+)/i);
          if (match) targetIdentifier = decodeURIComponent(match[1]);
        }
      }
    }

    if (!targetIdentifier) {
      return res.status(400).json({ success: false, message: 'Identificador / Query não encontrado neste log.' });
    }

    const cleanIdentifier = targetIdentifier.replace(/[^a-zA-Z0-9]/g, '');

    // Buscar a query gravada no banco para este identificador
    let queryRecord = await prisma.query.findFirst({
      where: {
        identifier: cleanIdentifier,
        ...(targetCompanyId ? { companyId: targetCompanyId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!queryRecord) {
      queryRecord = await prisma.query.findFirst({
        where: { identifier: cleanIdentifier },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (queryRecord) {
      return res.json({
        success: true,
        found: true,
        query: {
          id: queryRecord.id,
          identifier: queryRecord.identifier,
          source: queryRecord.source,
          status: queryRecord.status,
          cost: Number(queryRecord.cost),
          totalDeclaracoes: queryRecord.totalDeclaracoes,
          processingTimeMs: queryRecord.processingTimeMs,
          createdAt: queryRecord.createdAt,
          resultData: queryRecord.resultData,
          requestData: queryRecord.requestData
        }
      });
    }

    return res.json({
      success: true,
      found: false,
      identifier: targetIdentifier,
      cleanIdentifier,
      message: 'Nenhum resultado previamente armazenado no banco para esta consulta. Você pode executá-la ao vivo pelo Hub Oficial.'
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao recuperar resposta do log: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao recuperar resposta da consulta.' });
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
        allowedProducts: company.allowedProducts || ['ALL'],
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

/**
 * Listagem de usuários de uma empresa (Admin)
 */
export const listCompanyUsers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const users = await prisma.user.findMany({
      where: { companyId: id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao listar usuários da empresa ${req.params.id}: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários da empresa.' });
  }
};

/**
 * Alteração de senha de usuário de um cliente pelo SuperAdmin
 */
export const updateUserPasswordAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve possuir no mínimo 6 caracteres.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logger.info(`[ADMIN] Senha do usuário ${user.email} (${user.id}) alterada com sucesso pelo SuperAdmin.`);

    return res.json({
      success: true,
      message: `Senha de acesso para o usuário ${user.email} alterada com sucesso!`
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao alterar senha do usuário ${req.params.userId}: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao alterar senha do usuário.' });
  }
};

/**
 * Ativação ou Desativação de acesso de um usuário pelo SuperAdmin
 */
export const updateUserStatusAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'Status isActive é obrigatório.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: Boolean(isActive) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      }
    });

    const statusText = updated.isActive ? 'ativado' : 'desativado';
    logger.info(`[ADMIN] Usuário ${user.email} foi ${statusText} pelo SuperAdmin.`);

    return res.json({
      success: true,
      message: updated.isActive
        ? `Usuário ${user.email} ativado com sucesso!`
        : `Usuário ${user.email} desativado com sucesso! O acesso ao portal foi bloqueado.`,
      data: updated
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao atualizar status do usuário ${req.params.userId}: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar status do usuário.' });
  }
};

/**
 * Cadastro de novo usuário de acesso para um assinante
 */
export const createCompanyUserAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Já existe um usuário com este e-mail na plataforma.' });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        companyId: id,
        name: name || company.razaoSocial,
        email: cleanEmail,
        password: hashedPassword,
        role: 'COMPANY_USER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      }
    });

    return res.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      data: newUser
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao cadastrar usuário na empresa ${req.params.id}: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário.' });
  }
};

/**
 * Simulação / Acesso Direto como Assinante (Impersonate para auditoria e teste de visão do cliente)
 */
export const impersonateCompany = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    let targetUser = company.users[0];
    if (!targetUser) {
      const randomPass = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);
      const cleanDoc = company.cnpjCpf.replace(/\D/g, '');
      targetUser = await prisma.user.create({
        data: {
          companyId: company.id,
          name: `Admin ${company.razaoSocial}`,
          email: `acesso.${cleanDoc}@renacred.com.br`,
          password: randomPass,
          role: 'COMPANY_ADMIN',
          isActive: true
        }
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'renacred_jwt_super_secret_key_2026_x892';
    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        companyId: company.id,
        role: targetUser.role,
        isSuperAdmin: false,
        impersonatedBy: req.user.id
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    logger.info(`[ADMIN] SuperAdmin ${req.user.email} iniciou simulação de acesso para a empresa ${company.razaoSocial} (${company.cnpjCpf})`);

    return res.json({
      success: true,
      message: `Acesso de simulação para ${company.razaoSocial} gerado com sucesso!`,
      token,
      data: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isSuperAdmin: false,
        company: {
          id: company.id,
          razaoSocial: company.razaoSocial,
          cnpjCpf: company.cnpjCpf,
          accountType: company.accountType,
          creditsBalance: Number(company.creditsBalance),
          creditLimit: Number(company.creditLimit),
          billingDueDate: company.billingDueDate,
          allowedProducts: company.allowedProducts || ['ALL'],
          customPrices: company.customPrices || null,
          customQueryPrice: company.customQueryPrice ? Number(company.customQueryPrice) : null,
          isActive: company.isActive,
        }
      }
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao gerar impersonação da empresa ${req.params.id}: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao gerar acesso de simulação.' });
  }
};

/**
 * Retorna a tabela completa de precificação global de produtos
 * GET /api/admin/produtos/tabela-precos
 */
export const getProductPricingTable = async (req: Request, res: Response) => {
  try {
    const data = productPricingService.getPricingTable();
    return res.json({
      success: true,
      ...data
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao obter tabela de preços: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao carregar tabela de preços.' });
  }
};

/**
 * Atualiza custos e preços globais de produtos em lote ou individualmente
 * PUT /api/admin/produtos/tabela-precos
 */
export const updateProductPricingTable = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A lista de produtos para atualização é obrigatória.'
      });
    }

    const data = productPricingService.updatePricing(items);
    logger.info(`[ADMIN] SuperAdmin atualizou preços de ${items.length} produto(s).`);

    return res.json({
      success: true,
      message: 'Tabela de preços e custos atualizada com sucesso!',
      ...data
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao atualizar tabela de preços: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao salvar tabela de preços.' });
  }
};

/**
 * Restaura preços para os valores padrão de fábrica
 * POST /api/admin/produtos/tabela-precos/reset
 */
export const resetProductPricingTable = async (req: Request, res: Response) => {
  try {
    const { codes } = req.body || {};
    const data = productPricingService.resetToFactoryDefaults(codes);
    logger.info(`[ADMIN] SuperAdmin restaurou padrões de fábrica ${codes ? `para [${codes.join(', ')}]` : 'para todos os produtos'}.`);

    return res.json({
      success: true,
      message: 'Valores padrão de fábrica restaurados com sucesso!',
      ...data
    });
  } catch (error: any) {
    logger.error(`[ADMIN] Erro ao restaurar padrões de fábrica: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao restaurar padrões.' });
  }
};



