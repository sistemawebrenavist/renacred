import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { TransactionType, InvoiceStatus } from '../types/database';

export interface BillingCheckResult {
  allowed: boolean;
  code?: string;
  message?: string;
  price: number;
}

/**
 * Calcula o ciclo de faturamento ativo baseado no dia de vencimento da empresa.
 */
export function getBillingCycleDates(billingDueDate: number = 10): { cycleStart: Date; cycleEnd: Date; dueDate: Date } {
  const now = new Date();
  const day = Math.min(Math.max(billingDueDate || 10, 1), 31);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let startYear = currentYear;
  let startMonth = currentMonth;

  if (currentDay < day) {
    // Ciclo começou no mês anterior
    startMonth = currentMonth - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = currentYear - 1;
    }
  }

  const cycleStart = new Date(startYear, startMonth, day, 0, 0, 0, 0);

  // Fim do ciclo: 1 mês depois
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const cycleEnd = new Date(endYear, endMonth, day, 0, 0, 0, 0);
  cycleEnd.setMilliseconds(-1);

  // Data de vencimento da fatura do ciclo (normalmente no dia do vencimento do mês seguinte)
  const dueDate = new Date(endYear, endMonth, day, 23, 59, 59, 999);

  return { cycleStart, cycleEnd, dueDate };
}

export class BillingService {
  /**
   * Obtém o preço vigente da consulta para uma empresa específica
   */
  async getCompanyQueryPrice(companyId: string): Promise<number> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { customQueryPrice: true }
    });

    if (company && company.customQueryPrice !== null) {
      return Number(company.customQueryPrice);
    }

    // Busca valor global padrão
    const pricing = await prisma.pricingConfig.findFirst();
    return pricing ? Number(pricing.defaultQueryPrice) : 5.00;
  }

  /**
   * Valida se a empresa pode realizar a consulta (Pré-pago ou Pós-pago)
   */
  async checkEligibility(companyId: string): Promise<BillingCheckResult> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        razaoSocial: true,
        accountType: true,
        creditsBalance: true,
        creditLimit: true,
        billingDueDate: true,
        customQueryPrice: true,
        isActive: true,
      }
    });

    if (!company) {
      return { allowed: false, code: 'COMPANY_NOT_FOUND', message: 'Empresa não encontrada.', price: 0 };
    }

    if (!company.isActive) {
      return { allowed: false, code: 'COMPANY_BLOCKED', message: 'Conta bloqueada ou inativa.', price: 0 };
    }

    const price = company.customQueryPrice ? Number(company.customQueryPrice) : await this.getCompanyQueryPrice(companyId);

    // 1. Regra para PRÉ-PAGO: saldo deve ser >= preço da consulta
    if (company.accountType === 'PRE_PAID') {
      const balance = Number(company.creditsBalance);
      if (balance < price) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_CREDITS',
          message: `Saldo insuficiente (R$ ${balance.toFixed(2)}). O valor da consulta é R$ ${price.toFixed(2)}. Efetue uma recarga via Pix para continuar.`,
          price,
        };
      }
      return { allowed: true, price };
    }

    // 2. Regra para PÓS-PAGO: consumo dentro do limite de crédito
    if (company.accountType === 'POST_PAID') {
      const limit = Number(company.creditLimit);
      if (limit > 0) {
        const { cycleStart, cycleEnd } = getBillingCycleDates(company.billingDueDate);
        
        // Somar consultas realizadas no ciclo vigente
        const queriesAggregate = await prisma.query.aggregate({
          where: {
            companyId,
            status: 'COMPLETED',
            createdAt: { gte: cycleStart, lte: cycleEnd }
          },
          _sum: { cost: true }
        });

        const currentSpent = Number(queriesAggregate._sum.cost || 0);
        if (currentSpent + price > limit) {
          return {
            allowed: false,
            code: 'CREDIT_LIMIT_EXCEEDED',
            message: `Limite de crédito pós-pago atingido (Consumo atual: R$ ${currentSpent.toFixed(2)} / Limite: R$ ${limit.toFixed(2)}). Contate o suporte.`,
            price,
          };
        }
      }
      return { allowed: true, price };
    }

    return { allowed: true, price };
  }

  /**
   * Processa a tarifação de uma consulta realizada com sucesso
   */
  async chargeQuery(companyId: string, queryId: string, price: number): Promise<void> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { accountType: true, creditsBalance: true, billingDueDate: true }
    });

    if (!company) return;

    if (company.accountType === 'PRE_PAID') {
      await prisma.$transaction(async (tx) => {
        const currentBalance = Number(company.creditsBalance);
        const newBalance = Math.max(0, currentBalance - price);

        // Atualizar saldo
        await tx.company.update({
          where: { id: companyId },
          data: { creditsBalance: newBalance }
        });

        // Registrar extrato
        await tx.creditTransaction.create({
          data: {
            companyId,
            type: TransactionType.QUERY_DEBIT,
            amount: price,
            balance: newBalance,
            description: `Consulta de Histórico Imobiliário (ID: ${queryId.slice(0, 8)})`,
            relatedQueryId: queryId,
          }
        });
      });
      logger.info(`[BILLING] Debitado R$ ${price.toFixed(2)} da empresa ${companyId} (Pré-pago)`);
    } else if (company.accountType === 'POST_PAID') {
      // Pós-pago: acumula na fatura ativa do ciclo
      const { cycleStart, cycleEnd, dueDate } = getBillingCycleDates(company.billingDueDate);

      const invoice = await prisma.invoice.findFirst({
        where: {
          companyId,
          status: InvoiceStatus.OPEN,
          cycleStart: { gte: cycleStart },
          cycleEnd: { lte: cycleEnd }
        }
      });

      if (invoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            totalQueries: { increment: 1 },
            totalAmount: { increment: price }
          }
        });
      } else {
        await prisma.invoice.create({
          data: {
            companyId,
            cycleStart,
            cycleEnd,
            dueDate,
            totalQueries: 1,
            totalAmount: price,
            status: InvoiceStatus.OPEN
          }
        });
      }
      logger.info(`[BILLING] Acumulado R$ ${price.toFixed(2)} na fatura pós-paga da empresa ${companyId}`);
    }
  }
}

export const billingService = new BillingService();
