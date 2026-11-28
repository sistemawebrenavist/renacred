import assert from 'assert';
import {
  buscarCodigoSusepPorCnpj,
  isCnaeSeguradoraNaoVida,
  isNomeSeguradora,
  mascararNomeSegurado,
  mascararDocumentoSegurado,
  calcularDataSinistro30DiasAntes,
  formatarCnpj,
  getTotalSeguradorasSusep
} from '../src/utils/susepHelper';
import { normalizeE24 } from '../src/services/productNormalizers';

async function runTests() {
  console.log('=== TESTES UNITÁRIOS PRODUTO E24 (BDVII) ===');

  // 1. Validar carregamento da tabela SUSEP
  const totalSusep = getTotalSeguradorasSusep();
  console.log(`1. Total de seguradoras SUSEP indexadas: ${totalSusep}`);
  assert(totalSusep > 150, 'Tabela SUSEP deve possuir mais de 150 registros');

  // 2. Validar busca SUSEP por CNPJ exato e por raiz (Filial -> Matriz)
  const susepZurichMatriz = buscarCodigoSusepPorCnpj('17197385000121');
  const susepZurichFilial = buscarCodigoSusepPorCnpj('17.197.385/0078-00'); // Filial real do caso AZZ2H58
  assert.strictEqual(susepZurichMatriz, '05495', 'Matriz Zurich deve retornar SUSEP 05495');
  assert.strictEqual(susepZurichFilial, '05495', 'Filial Zurich (0078-00) deve resolver pela raiz para SUSEP 05495');
  console.log('2. Cruzamento SUSEP Matriz & Filial (Zurich 05495): OK');

  // 3. Validar gatilho CNAE e Nome Seguradora (com proteção anti-corretora)
  assert.strictEqual(isCnaeSeguradoraNaoVida('6512-0/00'), true);
  assert.strictEqual(isCnaeSeguradoraNaoVida('6512000'), true);
  assert.strictEqual(isCnaeSeguradoraNaoVida('4511-1/01'), false);
  assert.strictEqual(isNomeSeguradora('ZURICH MINAS BRASIL SEGUROS S.A.'), true);
  assert.strictEqual(isNomeSeguradora('SILVA CORRETORA DE SEGUROS LTDA'), false, 'Corretora NÃO pode positivar BDVII');
  console.log('3. Gatilhos CNAE 6512-0/00 e Anti-Corretora: OK');

  // 4. Validar Data do Sinistro (30 dias antes da posse da seguradora)
  const dataSinistro = calcularDataSinistro30DiasAntes('09/05/2017');
  assert.strictEqual(dataSinistro, '09/04/2017', '30 dias antes de 09/05/2017 deve ser 09/04/2017');
  console.log(`4. Cálculo Data do Sinistro (09/05/2017 - 30d = ${dataSinistro}): OK`);

  // 5. Validar Máscaras LGPD do Segurado (Bloco 03)
  const nomeMask = mascararNomeSegurado('LILIAN DINIS MARTINS DURANTE');
  assert.strictEqual(nomeMask, 'LILIAN ***** ******* *******');
  const docPf = mascararDocumentoSegurado('246.887.718-78');
  assert.strictEqual(docPf.tipoDocumento, 'CPF');
  assert.strictEqual(docPf.documentoMascarado, '246.***.***-**');
  const docPj = mascararDocumentoSegurado('12345678000190');
  assert.strictEqual(docPj.tipoDocumento, 'CNPJ');
  assert.strictEqual(docPj.documentoMascarado, '12.345.678/0001-90');
  console.log(`5. Máscaras LGPD (${nomeMask} | ${docPf.documentoMascarado} | ${docPj.documentoMascarado}): OK`);

  // 6. Validar Normalizer E24 com cenário completo AZZ2H58
  const normalized = normalizeE24({
    placa: 'AZZ2H58',
    positivo: true,
    status: 'POSITIVO',
    mensagem: 'Consta registro de Sinistro com Indenização Integral (BDVII).',
    bloco01Entidade: {
      entidade: 'ZURICH MINAS BRASIL SEGUROS S.A.',
      cnpj: formatarCnpj('17197385007800'),
      codigoSusep: '05495'
    },
    bloco02Sinistro: {
      ramo: 'Automóvel',
      tipoSeguro: 'Compreensivo',
      status: 'Sinistro Indenizado Integralmente',
      dataSinistro: '09/04/2017',
      dataPosseSeguradora: '09/05/2017',
      cidadeUf: 'CURITIBA / PR'
    },
    bloco03Segurado: {
      nomeCompleto: nomeMask,
      tipoDocumento: docPf.tipoDocumento,
      documento: docPf.documentoMascarado
    },
    bloco04Veiculo: {
      placa: 'AZZ2H58',
      chassi: '3GNCJ8EW8FL180529',
      renavam: '01065445676',
      marca: 'CHEV',
      modelo: 'TRACKER LTZ AT',
      anoFabricacao: '2015',
      anoModelo: '2015',
      cor: 'PRETA',
      fipe: '004444-0',
      valor: 'R$ 68.900,00'
    }
  }, 'AZZ2H58');

  assert.strictEqual(normalized.totalRegistros, 1);
  assert.strictEqual(normalized.dados.bloco01_entidade.codigo_susep, '05495');
  assert.strictEqual(normalized.dados.bloco02_sinistro.data_sinistro, '09/04/2017');
  assert.strictEqual(normalized.dados.bloco03_segurado.documento, '246.***.***-**');
  console.log('6. Normalizer E24 (4 Blocos): OK');

  console.log('\n✅ TODOS OS TESTES E24 BDVII PASSARAM COM SUCESSO!');
}

runTests().catch((err) => {
  console.error('❌ FALHA NOS TESTES E24:', err);
  process.exit(1);
});
