import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { TransactionType, InvoiceStatus } from '../types/database';

/**
 * Webhook para receber confirmações de pagamento da InfinityPay
 * POST /api/webhooks/infinitypay
 */
export const handleInfinityPayWebhook = async (req: Request, res: Response) => {
  try {
    const { order_nsu, nsu, transaction_nsu, status, paid_amount, capture_method } = req.body;
    const actualOrderNsu = order_nsu || nsu;

    logger.info(`[WEBHOOK INFINITYPAY] Recebido evento para NSU ${actualOrderNsu}, Status: ${status}`);

    const payment = await prisma.payment.findUnique({
      where: { orderNsu: actualOrderNsu },
      include: { company: true }
    });

    if (!payment) {
      logger.warn(`[WEBHOOK INFINITYPAY] Pagamento não localizado para NSU: ${actualOrderNsu}`);
      return res.status(404).json({ success: false, message: 'Pagamento não encontrado.' });
    }

    if (payment.status === 'PAID') {
      return res.json({ success: true, message: 'Pagamento já processado anteriormente.' });
    }

    if (status === 'paid') {
      const companyId = payment.companyId;
      const amountInBrl = paid_amount ? Number(paid_amount) / 100 : Number(payment.amount);

      await prisma.$transaction(async (tx) => {
        // 1. Atualizar pagamento
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            transactionNsu: transaction_nsu || undefined,
            paidAmount: amountInBrl,
            paidAt: new Date(),
            captureMethod: capture_method || 'pix',
          }
        });

        // 2. Se for recarga de créditos (orderNsu começa com CRED_)
        if (actualOrderNsu.startsWith('CRED_')) {
          const currentBalance = Number(payment.company.creditsBalance);
          const newBalance = currentBalance + amountInBrl;

          await tx.company.update({
            where: { id: companyId },
            data: {
              creditsBalance: newBalance,
              isActive: true,
            }
          });

          await tx.creditTransaction.create({
            data: {
              companyId,
              type: TransactionType.RECHARGE,
              amount: amountInBrl,
              balance: newBalance,
              description: `Recarga de Créditos via InfinityPay (${capture_method === 'credit_card' ? 'Cartão' : 'Pix'})`,
            }
          });

          logger.info(`[WEBHOOK] Saldo creditado: R$ ${amountInBrl.toFixed(2)} para empresa ${payment.company.razaoSocial}`);
        }

        // 3. Se for pagamento de fatura pós-paga (orderNsu começa com INV_)
        if (actualOrderNsu.startsWith('INV_')) {
          const invoiceId = actualOrderNsu.split('_')[1];
          if (invoiceId) {
            await tx.invoice.update({
              where: { id: invoiceId },
              data: {
                status: InvoiceStatus.PAID,
                paidAt: new Date(),
              }
            });
            logger.info(`[WEBHOOK] Fatura pós-paga ${invoiceId} marcada como PAGA`);
          }
        }
      });

      return res.json({ success: true, message: 'Pagamento confirmado e saldo creditado.' });
    }

    return res.json({ success: true, message: 'Evento recebido.' });
  } catch (error: any) {
    logger.error(`[WEBHOOK INFINITYPAY] Erro ao processar webhook: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro interno no processamento do webhook.' });
  }
};
