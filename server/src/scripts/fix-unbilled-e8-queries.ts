import { prisma } from '../config/database';
import { billingService } from '../services/billing.service';
import { SERVER_PRODUCTS } from '../config/productsCatalog';
import { logger } from '../utils/logger';

/**
 * Script de Manutenção Pericial: Recalcular e Tarifar Consultas E8 (RENAINF) Não Tarifadas
 * 
 * Uso:
 *   npx tsx server/src/scripts/fix-unbilled-e8-queries.ts [--dry-run]
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`================================================================`);
  console.log(`🔍 AUDITORIA E CORREÇÃO DE TARIFAS E8 (RENAINF) - RENACRED`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação apenas)' : 'EXECUÇÃO REAL'}`);
  console.log(`================================================================\n`);

  // 1. Localizar consultas E8 concluídas com custo R$ 0,00
  const queries = await prisma.query.findMany({
    where: {
      status: 'COMPLETED',
      cost: 0,
    },
    include: {
      company: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const e8Queries = queries.filter((q) => {
    const reqData = (q.requestData as any) || {};
    const prod = (reqData.product || reqData.productCode || '').toUpperCase();
    return prod === 'E8';
  });

  console.log(`Total de consultas concluídas com custo R$ 0,00: ${queries.length}`);
  console.log(`Consultas específicas do produto E8 (RENAINF): ${e8Queries.length}\n`);

  if (e8Queries.length === 0) {
    console.log('✅ Nenhuma consulta E8 com custo R$ 0,00 pendente de correção.');
    return;
  }

  const defaultE8Price = SERVER_PRODUCTS.find((p) => p.code === 'E8')?.defaultPrice || 1.32;
  let totalBilled = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const q of e8Queries) {
    const company = q.company;
    if (!company) {
      console.log(`⚠️ Consulta ${q.id} (${q.identifier}) sem empresa associada. Ignorando.`);
      skippedCount++;
      continue;
    }

    const customPrices = (company.customPrices as any) || {};
    const isMasterAdmin =
      company.cnpjCpf === '00000000000191' ||
      company.razaoSocial?.toLowerCase().includes('renacred') ||
      Number(company.creditLimit) >= 999999 ||
      Boolean(customPrices.isUnlimited);

    if (isMasterAdmin) {
      console.log(`ℹ️ [ISENTO] Consulta ${q.id} da empresa matriz/admin ${company.razaoSocial}. Mantendo isenção.`);
      skippedCount++;
      continue;
    }

    // Determinar preço configurado para o cliente
    let price = defaultE8Price;
    if (typeof customPrices.E8 === 'number') {
      price = Number(customPrices.E8);
    } else if (typeof customPrices.e8 === 'number') {
      price = Number(customPrices.e8);
    } else if (company.customQueryPrice) {
      // Compatibilidade legada se houver
      price = Number(company.customQueryPrice);
    }

    console.log(
      `📌 [TARIFAR] Query ${q.id} | Placa: ${q.identifier} | Data: ${q.createdAt.toISOString()} | Cliente: ${company.razaoSocial} (${company.cnpjCpf}) | Valor: R$ ${price.toFixed(2)}`
    );

    if (!isDryRun) {
      // 1. Atualizar custo no registro da query
      await prisma.query.update({
        where: { id: q.id },
        data: { cost: price },
      });

      // 2. Efetuar cobrança via BillingService (debita saldo pré-pago ou adiciona na fatura pós-paga)
      await billingService.chargeQuery(company.id, q.id, price);
    }

    totalBilled += price;
    updatedCount++;
  }

  console.log(`\n================================================================`);
  console.log(`📊 RESUMO DA OPERAÇÃO:`);
  console.log(`Consultas E8 processadas: ${updatedCount}`);
  console.log(`Consultas isentas/ignoradas: ${skippedCount}`);
  console.log(`Valor total faturado/corrigido: R$ ${totalBilled.toFixed(2)}`);
  console.log(`================================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na execução do script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

