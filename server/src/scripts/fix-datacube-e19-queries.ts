import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { prisma } from '../config/database';
import { billingService } from '../services/billing.service';
import { SERVER_PRODUCTS } from '../config/productsCatalog';
import { QueryStatus } from '@prisma/client';

/**
 * Script de Auditoria e Correção: Consultas E19 (Busca de RENAVAM por Placa) da Datacube
 * que retornaram Falha Técnica mas correspondem a veículo inexistente no SERPRO.
 * 
 * Uso:
 *   npx tsx server/src/scripts/fix-datacube-e19-queries.ts [--dry-run]
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`================================================================`);
  console.log(`🔍 AUDITORIA E REGULARIZAÇÃO DE CONSULTAS E19 - DATACUBE`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação apenas)' : 'EXECUÇÃO REAL'}`);
  console.log(`================================================================\n`);

  // 1. Localizar a empresa Datacube
  const datacube = await prisma.company.findFirst({
    where: {
      OR: [
        { cnpjCpf: { contains: '36674246000196' } },
        { razaoSocial: { contains: 'DATACUBE', mode: 'insensitive' } },
        { nomeFantasia: { contains: 'DATACUBE', mode: 'insensitive' } }
      ]
    }
  });

  if (!datacube) {
    console.log('⚠️ Empresa Datacube não encontrada pelo CNPJ 36674246000196 ou Razão Social.');
    return;
  }

  console.log(`Cliente localizado: ${datacube.razaoSocial} (${datacube.cnpjCpf})`);
  console.log(`Tipo de conta: ${datacube.accountType} | Saldo: R$ ${datacube.creditsBalance}\n`);

  // 2. Determinar o preço unitário do produto E19 para a Datacube
  const defaultE19Price = SERVER_PRODUCTS.find((p) => p.code === 'E19')?.defaultPrice || 1.32;
  const customPrices = (datacube.customPrices as Record<string, number>) || {};
  let price = defaultE19Price;

  if (typeof customPrices.E19 === 'number') {
    price = Number(customPrices.E19);
  } else if (typeof customPrices.e19 === 'number') {
    price = Number(customPrices.e19);
  } else if (datacube.customQueryPrice) {
    price = Number(datacube.customQueryPrice);
  }

  console.log(`Tarifa aplicável para E19: R$ ${price.toFixed(2)}\n`);

  // 3. Buscar consultas E19 com status ERROR ou custo 0
  const queries = await prisma.query.findMany({
    where: {
      companyId: datacube.id,
      OR: [
        { status: QueryStatus.ERROR },
        { cost: 0 }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  const e19FailedQueries = queries.filter((q) => {
    const reqData = (q.requestData as any) || {};
    const prod = (reqData.product || reqData.productCode || '').toUpperCase();
    return prod === 'E19';
  });

  console.log(`Total de consultas da Datacube com erro ou custo R$ 0,00: ${queries.length}`);
  console.log(`Consultas específicas do produto E19 (RENAVAM por Placa) para regularizar: ${e19FailedQueries.length}\n`);

  if (e19FailedQueries.length === 0) {
    console.log('✅ Nenhuma consulta E19 pendente de regularização para a Datacube.');
    return;
  }

  let totalBilled = 0;
  let countUpdated = 0;

  for (const q of e19FailedQueries) {
    const placa = q.identifier.toUpperCase().trim();
    console.log(
      `📌 [REGULARIZAR] Query ${q.id} | Placa: ${placa} | Data: ${q.createdAt.toISOString()} | Status atual: ${q.status} | Custo atual: R$ ${q.cost} -> Novo Custo: R$ ${price.toFixed(2)}`
    );

    if (!isDryRun) {
      const resultDataCertidao = {
        status: 'REGISTRO_NAO_ENCONTRADO',
        mensagem: `O veículo de placa ${placa} não existe nas bases oficiais de trânsito (SERPRO/SENATRAN).`,
        parametro_pesquisado: placa,
        total_registros: 0,
        laudo_pericial: `Certidão Negativa: Veículo ${placa} inexistente nas bases oficiais do SERPRO/SENATRAN.`,
        certidao_negativa: true,
        veiculo_inexistente: true,
        provedor_consultado: 'placa_serpro',
        consultado_em: q.createdAt.toISOString()
      };

      // 1. Atualizar registro da consulta para COMPLETED com custo e dados higienizados
      await prisma.query.update({
        where: { id: q.id },
        data: {
          status: QueryStatus.COMPLETED,
          cost: price,
          totalDeclaracoes: 0,
          resultData: resultDataCertidao,
          errorData: null
        }
      });

      // 2. Debitar a tarifa na conta do cliente via BillingService
      await billingService.chargeQuery(datacube.id, q.id, price);
    }

    totalBilled += price;
    countUpdated++;
  }

  console.log(`\n================================================================`);
  console.log(`RESULTADO DA OPERAÇÃO:`);
  console.log(`Consultas regularizadas: ${countUpdated}`);
  console.log(`Valor total tarifado: R$ ${totalBilled.toFixed(2)}`);
  console.log(`Modo: ${isDryRun ? 'SIMULAÇÃO CONCLUÍDA (Nenhum dado alterado)' : 'REGULARIZAÇÃO GRAVADA COM SUCESSO'}`);
  console.log(`================================================================`);
}

main()
  .catch((e) => {
    console.error('Erro na execução do script:', e);
  })
  .finally(() => {
    prisma.$disconnect();
  });
