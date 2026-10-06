import { e20Service, classificarEntidadeProprietario } from '../src/services/e20Service';
import { normalizeE20 } from '../src/services/productNormalizers';

async function testClassificador() {
  console.log('\n--- 1. Testando Classificador Inteligente de Entidades ---');
  const testes = [
    { nome: 'LOCALIZA RENT A CAR SA', doc: '16670085000155', esperado: 'locadora' },
    { nome: 'UNIDAS LOCADORA DE VEICULOS S.A.', doc: '04437534000130', esperado: 'locadora' },
    { nome: 'MOVIDA LOCACAO DE VEICULOS S.A.', doc: '', esperado: 'locadora' },
    { nome: 'PORTO SEGURO COMPANHIA DE SEGUROS GERAIS', doc: '61198164000160', esperado: 'seguradora' },
    { nome: 'BRADESCO AUTO/RE COMPANHIA DE SEGUROS', doc: '', esperado: 'seguradora' },
    { nome: 'PREFEITURA MUNICIPAL DE BLUMENAU', doc: '', esperado: 'frota_publica' },
    { nome: 'SECRETARIA DA SEGURANCA PUBLICA POLICIA MILITAR', doc: '', esperado: 'frota_publica' },
    { nome: 'BANCO SANTANDER BRASIL S.A. - LEASING', doc: '', esperado: 'financeira' },
    { nome: 'BV FINANCEIRA SA CREDITO FINANCIAMENTO E INVESTIMENTO', doc: '', esperado: 'financeira' },
    { nome: 'JOAO DA SILVA PEREIRA', doc: '12345678909', esperado: 'particular' }
  ];

  let acertos = 0;
  for (const t of testes) {
    const obtido = classificarEntidadeProprietario(t.nome, t.doc);
    const ok = obtido === t.esperado;
    if (ok) acertos++;
    console.log(`  [${ok ? 'OK' : 'FAIL'}] "${t.nome}": esperado=${t.esperado}, obtido=${obtido}`);
  }
  console.log(`Classificador: ${acertos}/${testes.length} corretos.`);
  if (acertos !== testes.length) {
    throw new Error('Falha no classificador de entidades');
  }
}

async function testOrquestracaoE20() {
  console.log('\n--- 2. Testando Orquestração Completa do Produto E20 (Placa: MIR2011) ---');
  const startTime = Date.now();
  const e20Result = await e20Service.executarConsultaE20('MIR2011');
  const duration = Date.now() - startTime;

  console.log(`Orquestração concluída em ${duration}ms`);
  console.log('Placa:', e20Result.placa);
  console.log('Chassi:', e20Result.chassi);
  console.log('RENAVAM:', e20Result.renavam);
  console.log('Contingência RENAVAM Aplicada:', e20Result.contingenciaRenavamAplicada);
  console.log('Custo Interno Total: R$', e20Result.custoInternoTotal.toFixed(2));
  
  console.log('\n--- Resumo dos Cards Especializados ---');
  console.log('Veículo Marca/Modelo:', e20Result.veiculo?.marcaModelo);
  console.log('Roubo/Furto Status:', e20Result.roubo_furto?.status, `(${e20Result.roubo_furto?.totalOcorrencias} ocorrencia(s))`);
  console.log('Locadoras Status:', e20Result.locadoras?.status, `(${e20Result.locadoras?.total} registro(s))`);
  console.log('Seguradoras Status:', e20Result.seguradoras?.status, `(${e20Result.seguradoras?.total} registro(s), indenização integral: ${e20Result.seguradoras?.indenizacaoIntegral})`);
  console.log('Frota Pública Status:', e20Result.frota_publica?.status, `(${e20Result.frota_publica?.total} registro(s), viatura: ${e20Result.frota_publica?.isViatura})`);
  console.log('Financeiras Status:', e20Result.financeiras?.status, `(${e20Result.financeiras?.total} registro(s))`);
  console.log('Proprietários Total Histórico:', e20Result.proprietarios?.total);
  if (e20Result.proprietarios?.proprietario_atual) {
    console.log('Proprietário Atual:', e20Result.proprietarios.proprietario_atual.nome, `[${e20Result.proprietarios.proprietario_atual.classificacaoEntidade}]`);
  }

  console.log('\n--- 3. Testando Normalização Canônica (normalizeE20) ---');
  const normalized = normalizeE20(e20Result, 'MIR2011');
  console.log('Total Registros Normalizados:', normalized.totalRegistros);
  console.log('Dados Presentes:', normalized.dados !== null);

  if (normalized.totalRegistros !== 1 || !normalized.dados) {
    throw new Error('Falha na normalização do produto E20');
  }

  console.log('\n✅ Todos os testes do Produto E20 foram concluídos com sucesso!');
}

async function main() {
  await testClassificador();
  await testOrquestracaoE20();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro durante teste do Produto E20:', err);
  process.exit(1);
});
