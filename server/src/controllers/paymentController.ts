import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { infinityPayService } from '../services/infinitypay.service';
import { getBillingCycleDates } from '../services/billing.service';
import { logger } from '../utils/logger';

/**
 * Criação de recarga de créditos via InfinityPay (Pix / Cartão)
 */
export const createCreditsRecharge = async (req: any, res: Response) => {
  try {
    const { companyId, id: userId } = req.user;
    const { amount } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 20) {
      return res.status(400).json({
        success: false,
        message: 'O valor mínimo para recarga de créditos é de R$ 20,00.',
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { where: { id: userId } } }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const user = company.users[0];
    const orderNsu = `CRED_${companyId.slice(0, 8)}_${Date.now()}`;
    const amountInCents = Math.round(numAmount * 100);

    // 1. Criar registro de pagamento PENDING no banco
    const payment = await prisma.payment.create({
      data: {
        companyId,
        orderNsu,
        amount: numAmount,
        status: 'PENDING',
      }
    });

    // 2. Criar link de checkout na InfinityPay
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'https://renacred.com.br';
    const redirectUrl = `${origin}/pagamento/sucesso`;

    const checkout = await infinityPayService.createCheckoutLink({
      orderNsu,
      customerName: user?.name || company.razaoSocial,
      customerEmail: user?.email || company.email,
      customerPhone: company.telefone || '',
      redirectUrl,
      items: [
        {
          quantity: 1,
          price: amountInCents,
          description: `Recarga de Créditos Renacred - R$ ${numAmount.toFixed(2)}`,
        }
      ]
    });

    // 3. Atualizar com a URL do checkout
    await prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutUrl: checkout.url }
    });

    return res.json({
      success: true,
      data: {
        paymentId: payment.id,
        checkoutUrl: checkout.url,
        orderNsu,
        amount: numAmount,
      }
    });
  } catch (error: any) {
    logger.error(`[PAGAMENTO] Erro ao gerar recarga: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao processar pagamento.' });
  }
};

/**
 * Extrato financeiro de transações (recargas e débitos de consultas)
 */
export const listTransactions = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditTransaction.count({ where: { companyId } })
    ]);

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar extrato financeiro.' });
  }
};

/**
 * Listagem de faturas pós-pagas da empresa
 */
export const listInvoices = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;

    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { cycleStart: 'desc' },
    });

    return res.json({ success: true, data: invoices });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar faturas.' });
  }
};

/**
 * Detalhes da assinatura, plano, ciclo vigente e faturas da empresa
 */
export const getSubscriptionDetails = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpjCpf: true,
        accountType: true,
        creditsBalance: true,
        creditLimit: true,
        billingDueDate: true,
        customPrices: true,
        customQueryPrice: true,
        allowedProducts: true,
        isActive: true,
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const defaultPricing = await prisma.pricingConfig.findFirst();
    const customPrices = (company.customPrices as any) || {};
    const effectivePrice = typeof customPrices.E1 === 'number'
      ? Number(customPrices.E1)
      : (company.customQueryPrice !== null 
          ? Number(company.customQueryPrice) 
          : (defaultPricing ? Number(defaultPricing.defaultQueryPrice) : 5.00));

    // Calcular ciclo ativo
    const { cycleStart, cycleEnd, dueDate } = getBillingCycleDates(company.billingDueDate || 10);

    // Consultas no ciclo vigente
    const currentCycleAggregate = await prisma.query.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        createdAt: { gte: cycleStart, lte: cycleEnd }
      },
      _count: { id: true },
      _sum: { cost: true }
    });

    const totalQueriesInCycle = currentCycleAggregate._count.id || 0;
    const totalSpentInCycle = Number(currentCycleAggregate._sum.cost || 0);
    const creditLimitNum = Number(company.creditLimit || 0);

    const limitUsagePercent = creditLimitNum > 0 
      ? Math.min(100, (totalSpentInCycle / creditLimitNum) * 100)
      : 0;

    // Faturas históricas
    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { cycleStart: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        company: {
          id: company.id,
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia,
          cnpjCpf: company.cnpjCpf,
          accountType: company.accountType,
          creditsBalance: Number(company.creditsBalance),
          creditLimit: creditLimitNum,
          billingDueDate: company.billingDueDate,
          effectivePrice,
          customPrices: company.customPrices,
          isActive: company.isActive,
        },
        currentCycle: {
          cycleStart,
          cycleEnd,
          dueDate,
          totalQueries: totalQueriesInCycle,
          totalSpent: totalSpentInCycle,
          limitUsagePercent: Number(limitUsagePercent.toFixed(1)),
        },
        invoices: invoices.map(inv => ({
          id: inv.id,
          cycleStart: inv.cycleStart,
          cycleEnd: inv.cycleEnd,
          dueDate: inv.dueDate,
          totalQueries: inv.totalQueries,
          totalAmount: Number(inv.totalAmount),
          status: inv.status,
          checkoutUrl: inv.checkoutUrl,
          paidAt: inv.paidAt,
        }))
      }
    });
  } catch (error: any) {
    logger.error(`[PAYMENT] Erro ao obter detalhes da assinatura: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao buscar dados da assinatura.' });
  }
};

/**
 * Gerar link de pagamento para uma fatura aberta via InfinityPay
 */
export const payInvoiceCheckout = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const { id: invoiceId } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { company: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura não encontrada.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Esta fatura já se encontra quitada.' });
    }

    const numAmount = Number(invoice.totalAmount);
    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'O valor da fatura deve ser maior que zero para pagamento.' });
    }

    const orderNsu = `INV_${invoice.id}_${Date.now()}`;
    const amountInCents = Math.round(numAmount * 100);

    const origin = req.headers.origin || process.env.FRONTEND_URL || 'https://renacred.com.br';
    const redirectUrl = `${origin}/minha-assinatura?paid=true`;

    const checkout = await infinityPayService.createCheckoutLink({
      orderNsu,
      customerName: invoice.company.razaoSocial,
      customerEmail: invoice.company.email,
      customerPhone: invoice.company.telefone || '',
      redirectUrl,
      items: [
        {
          quantity: 1,
          price: amountInCents,
          description: `Fatura Renacred Venc. ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')} - R$ ${numAmount.toFixed(2)}`,
        }
      ]
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { checkoutUrl: checkout.url }
    });

    return res.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        checkoutUrl: checkout.url,
        orderNsu,
        amount: numAmount
      }
    });
  } catch (error: any) {
    logger.error(`[PAYMENT] Erro ao gerar pagamento da fatura: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao processar fatura.' });
  }
};

/**
 * Extrato unificado de consumo e faturamento de consultas
 * Compatível tanto com contas Pós-pagas quanto Pré-pagas
 */
export const getConsumptionStatement = async (req: any, res: Response) => {
  try {
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin || req.user?.role === 'SUPER_ADMIN');
    const targetCompanyId = (isSuperAdmin && req.query.companyId) ? String(req.query.companyId) : req.user.companyId;

    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpjCpf: true,
        accountType: true,
        billingDueDate: true,
        creditsBalance: true,
        creditLimit: true,
        customPrices: true,
        customQueryPrice: true,
      }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Empresa não encontrada.' });
    }

    const {
      startDate,
      endDate,
      source,
      search,
      page = 1,
      limit = 50,
      status
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Calcular ciclos
    const billingDay = company.billingDueDate || 10;
    const { cycleStart: currentCycleStart, cycleEnd: currentCycleEnd } = getBillingCycleDates(billingDay);

    // Ciclo anterior
    const prevStart = new Date(currentCycleStart);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(currentCycleStart);
    prevEnd.setMilliseconds(-1);

    // Construir filtro WHERE
    const where: any = {
      companyId: targetCompanyId,
    };

    if (status) {
      where.status = String(status);
    }

    // Filtro de data
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        if (String(endDate).length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    // Filtro de origem
    if (source && source !== 'ALL') {
      where.source = String(source).toUpperCase();
    }

    // Filtro de busca por identificador (Placa, CPF, CNPJ, Chassi)
    if (search && String(search).trim()) {
      const term = String(search).trim();
      where.identifier = {
        contains: term,
        mode: 'insensitive'
      };
    }

    // Buscar contagem e KPIs consolidados
    const [totalMatching, totalMatchingSum, totalApiCount, totalWebCount] = await Promise.all([
      prisma.query.count({ where }),
      prisma.query.aggregate({
        where,
        _sum: { cost: true }
      }),
      prisma.query.count({
        where: { ...where, source: 'API' }
      }),
      prisma.query.count({
        where: { ...where, source: 'WEB' }
      })
    ]);

    const totalAmount = Number(totalMatchingSum._sum.cost || 0);
    const averageTicket = totalMatching > 0 ? (totalAmount / totalMatching) : 0;

    // Buscar itens paginados
    const queries = await prisma.query.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: {
        id: true,
        identifier: true,
        source: true,
        status: true,
        cost: true,
        totalDeclaracoes: true,
        processingTimeMs: true,
        requestData: true,
        resultData: true,
        createdAt: true,
      }
    });

    // Formatar itens para exibição
    const items = queries.map((q) => {
      const reqData = (q.requestData as any) || {};
      const resData = (q.resultData as any) || {};

      let productCode = reqData.product || reqData.productCode || '';
      let productName = reqData.productName || '';

      if (!productCode) {
        if (q.source === 'API') {
          productCode = 'API_B2B';
          productName = 'Consulta Integrada via API';
        } else {
          productCode = 'WEB';
          productName = 'Consulta Portal Web';
        }
      }

      return {
        id: q.id,
        createdAt: q.createdAt,
        identifier: q.identifier,
        productCode: String(productCode).toUpperCase(),
        productName: productName,
        source: q.source,
        sourceLabel: q.source === 'API' ? 'API B2B' : 'Portal Web',
        cost: Number(q.cost || 0),
        status: q.status,
        totalDeclaracoes: q.totalDeclaracoes,
        processingTimeMs: q.processingTimeMs,
        requestData: reqData,
        resultData: resData,
      };
    });

    return res.json({
      success: true,
      data: {
        company: {
          id: company.id,
          razaoSocial: company.razaoSocial,
          cnpjCpf: company.cnpjCpf,
          accountType: company.accountType,
          billingDueDate: billingDay,
          creditsBalance: Number(company.creditsBalance || 0),
          creditLimit: Number(company.creditLimit || 0),
        },
        cycleInfo: {
          billingDueDate: billingDay,
          currentCycleStart: currentCycleStart.toISOString(),
          currentCycleEnd: currentCycleEnd.toISOString(),
          previousCycleStart: prevStart.toISOString(),
          previousCycleEnd: prevEnd.toISOString(),
        },
        kpis: {
          totalQueries: totalMatching,
          totalAmount: totalAmount,
          apiQueries: totalApiCount,
          webQueries: totalWebCount,
          averageTicket: averageTicket,
        },
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalMatching,
          totalPages: Math.ceil(totalMatching / limitNum) || 1,
        }
      }
    });

  } catch (error: any) {
    logger.error(`[BILLING] Erro ao buscar extrato de consumo: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao buscar extrato de consumo.' });
  }
};

