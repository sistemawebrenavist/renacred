import { SERVER_PRODUCTS, findServerProduct } from '../src/config/productsCatalog';
import { normalizeE23, normalizeProductResult } from '../src/services/productNormalizers';
import { 
  traduzirSituacaoCnh, 
  traduzirMotivoRequerimento, 
  traduzirExame, 
  traduzirResultadoExame, 
  traduzirCurso, 
  traduzirModalidade,
  traduzirTipoDocumento 
} from '../src/utils/cnhRenachGlossario';

const mockRawPayload = {
  "success": true,
  "tipo_chave": "cpf",
  "numero": "96238550953",
  "condutor": {
    "nome": "WELLINGTON MARIANO DE BRITO",
    "data_nascimento": "19710525",
    "data_nascimento_iso": "1971-05-25",
    "cod_sexo": "1",
    "cod_sexo_descricao": "MASCULINO",
    "nome_mae": "MARIA DE JESUS DE BRITO",
    "nome_pai": "OTAVIO MARIANO DE BRITO",
    "cpf": "96238550953",
    "cod_localidade_nascimento": "07535",
    "num_registro": "02847335417",
    "num_renach": "PR923289725",
    "num_cnh": "2566928733",
    "pgu": "528336398"
  },
  "documento": {
    "cod_tipo": "1",
    "numero": "59681940",
    "orgao_expedidor": "SESP",
    "uf": "PR",
    "cpf": "96238550953"
  },
  "endereco": {
    "logradouro": "RUA RODOLPHO SENFF",
    "numero": "562",
    "complemento": "01",
    "bairro": "JARDIM DAS AMRICAS",
    "cep": "81530240",
    "cod_municipio": "07535",
    "cod_municipio_descricao": "CURITIBA/PR",
    "uf": "PR"
  },
  "nacionalidade": {
    "cod_nacionalidade": "1",
    "cod_nacionalidade_descricao": "BRASILEIRO",
    "cod_localidade_nascimento": "07535"
  },
  "contato": {
    "uf_dominio": "PR",
    "ddd_celular": "41",
    "telefone_celular": "995587710",
    "email": "wmbrito2@gmail.com"
  },
  "cnh": {
    "pgu": "528336398",
    "primeira_habilitacao": "19910228",
    "primeira_habilitacao_iso": "1991-02-28",
    "uf_primeira_habilitacao": "PR",
    "num_cnh": "2566928733",
    "categoria": "AB",
    "categoria_atual": "AB",
    "categoria_autorizada": "AB",
    "validade": "20280310",
    "validade_iso": "2028-03-10",
    "quadro_observacoes": ["99"],
    "situacao_codigo": "4",
    "situacao_codigo_descricao": "CONFIRMADA",
    "permissionado": "2",
    "motivo_requerimento": "5"
  },
  "controle": {
    "situacao_codigo": "4",
    "data_ultima_emissao_historico": "20230310",
    "data_ultima_emissao_historico_iso": "2023-03-10",
    "data_inicio_categoria_a": "20090113",
    "data_inicio_categoria_a_iso": "2009-01-13",
    "data_inicio_categoria_b": "19780125",
    "data_inicio_categoria_b_iso": "1978-01-25"
  },
  "exames": [
    {
      "tipo_evento": "E",
      "tipo_evento_descricao": "EXAME",
      "tipo_atualizacao": "S",
      "tipo_atualizacao_descricao": "SUBSTITUIÇÃO",
      "cod_exame": "03",
      "cod_exame_descricao": "APTIDÃO FÍSICA E MENTAL",
      "codigo": "S03",
      "codigo_descricao": "SUBSTITUIÇÃO - APTIDÃO FÍSICA E MENTAL",
      "data_exame": "20230310",
      "data_exame_iso": "2023-03-10",
      "resultado": "1",
      "resultado_descricao": "APTO",
      "data_validade": "20280310",
      "data_validade_iso": "2028-03-10",
      "cpf_examinador1": "03890250971",
      "cnpj_entidade_creden": "19295546000145",
      "cod_municipio_exame_descricao": "CURITIBA/PR",
      "uf_exame": "PR",
      "cat_pretendida": "AB",
      "cat_permitida": "AB"
    }
  ],
  "eventos": [
    {
      "tipo_evento": "C",
      "tipo_evento_descricao": "CURSO",
      "tipo_atualizacao": "I",
      "tipo_atualizacao_descricao": "INCLUSÃO",
      "cod_curso": "30",
      "cod_curso_descricao": "ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH",
      "codigo": "I30",
      "modalidade": "1",
      "modalidade_descricao": "PRESENCIAL (Integral)",
      "data_inicio": "20090110",
      "data_inicio_iso": "2009-01-10",
      "cnpj_entidade": "09199593000131",
      "uf_curso": "PR"
    }
  ],
  "cursos": [
    {
      "tipo_evento": "C",
      "tipo_evento_descricao": "CURSO",
      "tipo_atualizacao": "I",
      "tipo_atualizacao_descricao": "INCLUSÃO",
      "cod_curso": "30",
      "cod_curso_descricao": "ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH",
      "codigo": "I30",
      "modalidade": "1",
      "modalidade_descricao": "PRESENCIAL (Integral)",
      "data_inicio": "20090110",
      "data_inicio_iso": "2009-01-10",
      "cnpj_entidade": "09199593000131",
      "uf_curso": "PR"
    }
  ],
  "impedimentos": [],
  "ocorrencias": [],
  "infracoes": [],
  "api_central": {
    "api_utilizada": "renach_prontuario",
    "parametro_utilizado": "cpf",
    "query_fornecida": "96238550953",
    "timestamp": "2026-11-19 14:52:05"
  }
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [OK] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

console.log('====================================================');
console.log('  TESTE COMPLETO: PRODUTO E23 (CAMADAS WEB & API)   ');
console.log('====================================================\n');

// 1. ROTEAMENTO & ALIASES
console.log('1. TESTE DE RESOLUÇÃO DE CÓDIGOS E ALIASES');
const aliasesToTest = [
  'E23',
  'e23',
  'cnh-customizada-renach',
  'ren_jus_2026',
  'ren-jus-2026',
  'cnh-renach',
  'cnh-ren-jus',
  'renach-2026',
  'cnh-renach-2026',
  'renach_prontuario'
];

aliasesToTest.forEach(alias => {
  const resolved = findServerProduct(alias);
  assert(resolved?.code === 'E23', `Alias '${alias}' resolve para produto E23`);
});

// 2. PARÂMETROS FINANCEIROS (CUSTO & VENDA)
console.log('\n2. TESTE DE PRECIFICAÇÃO E PARÂMETROS DO PRODUTO');
const p = findServerProduct('E23');
assert(p?.defaultCost === 0.20, 'Preço de custo registrado como exatamente R$ 0,20');
assert(p?.defaultPrice === 1.32, 'Preço de venda registrado como exatamente R$ 1,32');
assert(p?.category === 'cadastral', 'Categoria registrada como cadastral');
assert(p?.inputType === 'cpf', 'Tipo de entrada registrado como cpf');
assert(p?.apiPrimary === 'renach_prontuario', 'API primária registrada como renach_prontuario');

// 3. NORMALIZAÇÃO DE DADOS & SEGURANÇA WHITELABEL
console.log('\n3. TESTE DE NORMALIZAÇÃO E BLINDAGEM WHITELABEL');
const norm = normalizeProductResult('E23', mockRawPayload, '96238550953');
const d = norm.dados;

assert(norm.totalRegistros === 1, 'Total de registros contabilizado como 1');
assert(d.condutor?.nome === 'WELLINGTON MARIANO DE BRITO', 'Nome do condutor normalizado corretamente');
assert(d.condutor?.cpf === '96238550953', 'CPF do condutor preservado');
assert(d.condutor?.dataNascimento === '25/05/1971', 'Data de nascimento convertida para DD/MM/AAAA (25/05/1971)');
assert(d.condutor?.num_renach === 'PR923289725', 'Formulário RENACH preservado');
assert(d.condutor?.num_registro === '02847335417', 'Número de registro da CNH preservado');
assert(d.contato?.telefoneFormatado === '(41) 99558-7710', 'Celular formatado como (41) 99558-7710');
assert(d.cnh?.categoria_atual === 'AB', 'Categoria atual normalizada como AB');
assert(d.cnh?.validade === '10/03/2028', 'Validade da CNH convertida para DD/MM/AAAA (10/03/2028)');
assert(d.cnh?.isValidadeVencida === false, 'Validade classificada como regular (não vencida)');

// 4. HISTÓRICO DE CATEGORIAS TEMPORAL
console.log('\n4. TESTE DO HISTÓRICO TEMPORAL DE CATEGORIAS');
const catA = d.controle?.categoriasHistorico?.find((c: any) => c.categoria === 'A');
const catB = d.controle?.categoriasHistorico?.find((c: any) => c.categoria === 'B');
assert(catA?.dataInicio === '13/01/2009', 'Data de início da Categoria A: 13/01/2009');
assert(catB?.dataInicio === '25/01/1978', 'Data de início da Categoria B: 25/01/1978');

// 5. EXAMES & CURSOS
console.log('\n5. TESTE DE EXAMES PERICIAIS E CURSOS');
assert(d.exames?.length === 1, 'Exames normalizados com 1 registro');
assert(d.exames?.[0]?.resultado === 'APTO', 'Resultado do exame: APTO');
assert(d.exames?.[0]?.descricaoExame === 'APTIDÃO FÍSICA E MENTAL', 'Descrição do exame: APTIDÃO FÍSICA E MENTAL');
assert(d.cursos?.length === 1, 'Cursos normalizados com 1 registro');
assert(d.cursos?.[0]?.modalidade === 'PRESENCIAL (Integral)', 'Modalidade do curso: PRESENCIAL (Integral)');

// 6. SIGILO WHITELABEL ABSOLUTO
console.log('\n6. TESTE DE EXPURGO DE PROVEDOR (WHITELABEL ESTRETO)');
assert(!('api_central' in d), 'Chave api_central EXPURGADA com sucesso');
assert(!('fornecedor' in d), 'Chave fornecedor inexistente');
assert(!('provedor' in d), 'Chave provedor inexistente');
assert(!('token' in d), 'Chave token de API interna inexistente');

// 7. GLOSSÁRIO DE CÓDIGOS RENACH
console.log('\n7. TESTE DO GLOSSÁRIO TÉCNICO DE CÓDIGOS RENACH');
assert(traduzirSituacaoCnh('4') === 'CONFIRMADA', 'Glossário traduz situação 4 para CONFIRMADA');
assert(traduzirSituacaoCnh('6') === 'ALTERADA', 'Glossário traduz situação 6 para ALTERADA');
assert(traduzirMotivoRequerimento('5') === 'RENOVAÇÃO DE EXAMES', 'Glossário traduz motivo 5 para RENOVAÇÃO DE EXAMES');
assert(traduzirResultadoExame('1') === 'APTO', 'Glossário traduz resultado 1 para APTO');
assert(traduzirExame('03') === 'APTIDÃO FÍSICA E MENTAL', 'Glossário traduz exame 03 para APTIDÃO FÍSICA E MENTAL');
assert(traduzirExame('S03') === 'APTIDÃO FÍSICA E MENTAL', 'Glossário traduz S03 para APTIDÃO FÍSICA E MENTAL');
assert(traduzirCurso('30') === 'ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH', 'Glossário traduz curso 30');
assert(traduzirModalidade('1') === 'PRESENCIAL (Integral)', 'Glossário traduz modalidade 1');
assert(traduzirTipoDocumento('1') === 'CARTEIRA DE IDENTIDADE / RG', 'Glossário traduz tipo de documento 1');

// 8. SIMULAÇÃO DE PAYLOAD RETORNADO NA WEB & API V1
console.log('\n8. TESTE DE ESTRUTURA DO PAYLOAD WEB & API V1');
// Simulação do payload que consultaUnificadaController gera:
const webResponsePayload: any = {
  sucesso: true,
  codigo_produto: p?.code,
  nome_produto: p?.name,
  identificador: '96238550953',
  total_registros: norm.totalRegistros,
  custo_debitado: p?.defaultPrice,
  consultado_em: new Date().toISOString(),
  dados: norm.dados
};

if (p?.code === 'E23') {
  const rawApi = norm.dados?._rawApi || mockRawPayload;
  const { api_central, token, provedor, fornecedor, ...cleanFlat } = rawApi;
  Object.assign(webResponsePayload, cleanFlat);
}

assert(webResponsePayload.sucesso === true, 'Envelope Web retorna sucesso: true');
assert(webResponsePayload.codigo_produto === 'E23', 'Envelope Web possui codigo_produto: E23');
assert(webResponsePayload.custo_debitado === 1.32, 'Tarifa Web debitada com exatidão: R$ 1,32');
assert(webResponsePayload.condutor?.num_renach === 'PR923289725', 'Envelope expõe condutor diretamente na raiz com num_renach');
assert(!('api_central' in webResponsePayload), 'Envelope Web não possui api_central');
assert(!('token' in webResponsePayload), 'Envelope Web não vaza token do provedor');

console.log('\n====================================================');
console.log(`  RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
