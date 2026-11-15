import { prisma } from '../config/database';
import { billingService } from '../services/billing.service';
import { SERVER_PRODUCTS } from '../config/productsCatalog';
import { logger } from '../utils/logger';

/**
 * Script de Manutenção Pericial: Recalcular e Tarifar Consultas E19 (Busca de RENAVAM por Placa) Não Tarifadas
 * 
 * Uso:
 *   npx tsx server/src/scripts/fix-unbilled-e19-queries.ts [--dry-run]
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`================================================================`);
  console.log(`🔍 AUDITORIA E CORREÇÃO DE TARIFAS E19 (RENAVAM POR PLACA) - RENACRED`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação apenas)' : 'EXECUÇÃO REAL'}`);
  console.log(`================================================================\n`);

  // 1. Localizar consultas E19 concluídas com custo R$ 0,00
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

  const e19Queries = queries.filter((q) => {
    const reqData = (q.requestData as any) || {};
    const prod = (reqData.product || reqData.productCode || '').toUpperCase();
    return prod === 'E19';
  });

  console.log(`Total de consultas concluídas com custo R$ 0,00: ${queries.length}`);
  console.log(`Consultas específicas do produto E19 (RENAVAM por Placa): ${e19Queries.length}\n`);

  if (e19Queries.length === 0) {
    console.log('✅ Nenhuma consulta E19 com custo R$ 0,00 pendente de correção.');
    return;
  }

  const defaultE19Price = SERVER_PRODUCTS.find((p) => p.code === 'E19')?.defaultPrice || 1.32;
  let totalBilled = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const q of e19Queries) {
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
    let price = defaultE19Price;
    if (typeof customPrices.E19 === 'number') {
      price = Number(customPrices.E19);
    } else if (typeof customPrices.e19 === 'number') {
      price = Number(customPrices.e19);
    } else if (company.customQueryPrice) {
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
  console.log(`Consultas E19 processadas: ${updatedCount}`);
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
