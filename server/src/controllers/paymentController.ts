import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { infinityPayService } from '../services/infinitypay.service';
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
