import { prisma } from '../config/database';
import { billingService } from '../services/billing.service';
import { logger } from '../utils/logger';

/**
 * Script utilitário para recalcular faturas abertas com base nas tarifas customizadas atuais
 * Uso:
 *   npx tsx server/src/scripts/recalculate-open-invoices.ts [cnpj_ou_id_opcional]
 */
async function main() {
  const target = process.argv[2];

  console.log('================================================================');
  console.log('🔄 RECÁLCULO DE FATURAS ABERTAS COM TARIFAS CUSTOMIZADAS');
  console.log('================================================================\n');

  let companies: Array<{ id: string; razaoSocial: string; cnpjCpf: string }> = [];

  if (target) {
    const cleanTarget = target.replace(/\D/g, '');
    const found = await prisma.company.findMany({
      where: {
        OR: [
          { id: target },
          { cnpjCpf: { contains: cleanTarget || target } },
          { razaoSocial: { contains: target, mode: 'insensitive' } }
        ]
      },
      select: { id: true, razaoSocial: true, cnpjCpf: true }
    });
    companies = found;
  } else {
    // Buscar todas as empresas com faturas abertas
    const openInvoices = await prisma.invoice.findMany({
      where: { status: 'OPEN' },
      select: {
        company: {
          select: { id: true, razaoSocial: true, cnpjCpf: true }
        }
      }
    });

    const uniqueMap = new Map<string, { id: string; razaoSocial: string; cnpjCpf: string }>();
    for (const inv of openInvoices) {
      if (inv.company) {
        uniqueMap.set(inv.company.id, inv.company);
      }
    }
    companies = Array.from(uniqueMap.values());
  }

  console.log(`Empresas selecionadas para recálculo: ${companies.length}\n`);

  for (const c of companies) {
    console.log(`Processando: ${c.razaoSocial} (${c.cnpjCpf})...`);
    try {
      const res = await billingService.recalculateOpenInvoice(c.id);
      if (res) {
        console.log(
          `  ✅ Sucesso! Fatura ${res.invoiceId} atualizada: de R$ ${res.previousAmount.toFixed(2)} para R$ ${res.totalAmount.toFixed(2)} (${res.queriesUpdated} queries reajustadas de um total de ${res.totalQueries})\n`
        );
      } else {
        console.log(`  ℹ️ Nenhuma fatura aberta encontrada ou empresa isenta.\n`);
      }
    } catch (err: any) {
      console.error(`  ❌ Erro ao recalcular ${c.razaoSocial}: ${err.message}\n`);
    }
  }

  console.log('================================================================');
  console.log('🏁 Operação concluída com sucesso.');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

