import { prisma } from '../config/database';
import { billingService } from '../services/billing.service';
import { TransactionType } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Script de Saneamento Pericial: Corrigir Consultas que Falharam mas foram Marcadas como Concluídas/Tarifadas
 * 
 * Uso:
 *   npx tsx src/scripts/sanitize-failed-queries.ts [--dry-run]
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`================================================================`);
  console.log(`🔍 AUDITORIA E SANEAMENTO DE CONSULTAS COM FALHA TÉCNICA`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação apenas)' : 'EXECUÇÃO REAL'}`);
  console.log(`================================================================\n`);

  // Buscar todas as consultas tarifadas (cost > 0)
  const queries = await prisma.query.findMany({
    where: {
      cost: { gt: 0 },
    },
    include: {
      company: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Total de consultas com custo > 0 encontradas: ${queries.length}`);

  // Filtrar aquelas que na realidade continham falhas técnicas / negativas do provedor
  const failedQueries = queries.filter((q) => {
    const resData: any = q.resultData || {};
    const reqData: any = q.requestData || {};
    const prod = (reqData.product || reqData.productCode || '').toUpperCase();

    // 1. Flag explícita de erro da API
    if (resData.success === false) return true;
    if (resData.error) return true;

    // 2. Mensagens típicas de falha de resolução / scraper
    const msg = String(resData.mensagem || resData.message || '').toLowerCase();
    if (
      msg.includes('nao foi possivel obter renavam') ||
      msg.includes('nao foi possivel encontrar') ||
      msg.includes('resolve_failed') ||
      msg.includes('api em manutencao') ||
      msg.includes('timeout')
    ) {
      return true;
    }

    // 3. E2 (Histórico) vazio com indício de não localização
    if (prod === 'E2' && Array.isArray(resData.historico) && resData.historico.length === 0) {
      if (msg.includes('nao foi possivel') || !resData.veiculo) {
        return true;
      }
    }

    return false;
  });

  console.log(`Consultas que falharam e foram indevidamente faturadas: ${failedQueries.length}\n`);

  if (failedQueries.length === 0) {
    console.log('✅ Nenhuma consulta inconsistente encontrada no banco de dados.');
    return;
  }

  const affectedCompanyIds = new Set<string>();
  let totalRefunded = 0;
  let countUpdated = 0;

  for (const q of failedQueries) {
    const costNum = Number(q.cost || 0);
    const company = q.company;
    const reqData: any = q.requestData || {};
    const prod = (reqData.product || reqData.productCode || 'N/A').toUpperCase();
    const resData: any = q.resultData || {};
    const errorMsg = resData.mensagem || resData.message || resData.error || 'Falha técnica';

    console.log(
      `📌 [CORRIGIR] Query ${q.id} | Prod: ${prod} | Alvo: ${q.identifier} | Custo: R$ ${costNum.toFixed(2)} | Empresa: ${company?.razaoSocial || q.companyId} | Motivo: "${errorMsg}"`
    );

    if (!isDryRun) {
      // 1. Atualizar query para status ERROR e cost = 0
      await prisma.query.update({
        where: { id: q.id },
        data: {
          status: 'ERROR',
          cost: 0,
        },
      });

      // 2. Se a empresa for pré-paga, estornar o valor debitado
      if (company && company.accountType === 'PRE_PAID' && costNum > 0) {
        await prisma.$transaction(async (tx) => {
          const currentBal = Number(company.creditsBalance || 0);
          const newBal = currentBal + costNum;

          await tx.company.update({
            where: { id: company.id },
            data: { creditsBalance: newBal },
          });

          await tx.creditTransaction.create({
            data: {
              companyId: company.id,
              type: TransactionType.MANUAL_ADJUSTMENT,
              amount: costNum,
              balance: newBal,
              description: `Estorno pericial de consulta com falha técnica (${prod} - ${q.identifier})`,
              relatedQueryId: q.id,
            },
          });
        });
      }

      if (company) {
        affectedCompanyIds.add(company.id);
      }
    }

    totalRefunded += costNum;
    countUpdated++;
  }

  console.log(`\n================================================================`);
  console.log(`Resumo do Saneamento:`);
  console.log(`- Consultas saneadas: ${countUpdated}`);
  console.log(`- Total de tarifas estornadas/zeradas: R$ ${totalRefunded.toFixed(2)}`);
  console.log(`- Empresas afetadas: ${affectedCompanyIds.size}`);

  if (!isDryRun && affectedCompanyIds.size > 0) {
    console.log(`\nRecalculando faturas abertas para as empresas afetadas...`);
    for (const compId of affectedCompanyIds) {
      try {
        const res = await billingService.recalculateOpenInvoice(compId);
        if (res) {
          console.log(`  ✅ Fatura ${res.invoiceId} recalculada: R$ ${res.previousAmount.toFixed(2)} -> R$ ${res.totalAmount.toFixed(2)}`);
        }
      } catch (err: any) {
        console.error(`  ❌ Erro ao recalcular fatura da empresa ${compId}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Operação de saneamento concluída com sucesso!`);
}

main()
  .catch((e) => {
    console.error('Erro na execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
