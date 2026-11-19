import { normalizeE23, normalizeProductResult } from '../src/services/productNormalizers';
import { SERVER_PRODUCTS, findServerProduct } from '../src/config/productsCatalog';

const samplePayload = {
  "success": true,
  "tipo_chave": "cpf",
  "numero": "96238550953",
  "consulta": {
    "tipo_chave": "7",
    "numero": "96238550953"
  },
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
    "nome_social": "",
    "filiacao_1": "",
    "filiacao_2": "",
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
    "cod_localidade_nascimento": "07535",
    "data_cadastramento": "",
    "data_cadastramento_iso": null
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
    "categoria_rebaixada": "",
    "categoria_autorizada": "AB",
    "validade": "20280310",
    "validade_iso": "2028-03-10",
    "quadro_observacoes": [
      "99"
    ],
    "quadro_observacoes_descricao": {
      "99": "SEM OBSERVAÇÃO"
    },
    "situacao_codigo": "4",
    "situacao_codigo_descricao": "CONFIRMADA",
    "situacao_anterior": "6",
    "situacao_anterior_descricao": "ALTERADA",
    "permissionado": "2",
    "permissionado_descricao": "Não",
    "motivo_requerimento": "5",
    "motivo_requerimento_descricao": {
      "5": "RENOVACAO DE EXAMES"
    }
  },
  "controle": {
    "situacao_codigo": "4",
    "situacao_codigo_descricao": "CONFIRMADA",
    "situacao_anterior": "6",
    "situacao_anterior_descricao": "ALTERADA",
    "motivo_requerimento": "5",
    "motivo_requerimento_descricao": {
      "5": "RENOVACAO DE EXAMES"
    },
    "permissionado": "2",
    "permissionado_descricao": "Não",
    "num_registro": "02847335417",
    "num_renach": "PR923289725",
    "num_cnh": "2566928733",
    "cod_cancelamento": "",
    "categoria_atual": "AB",
    "categoria_rebaixada": "",
    "categoria_autorizada": "AB",
    "validade": "20280310",
    "validade_iso": "2028-03-10",
    "quadro_observacoes": [
      "99"
    ],
    "quadro_observacoes_descricao": {
      "99": "SEM OBSERVAÇÃO"
    },
    "data_ultima_emissao_historico": "20230310",
    "data_ultima_emissao_historico_iso": "2023-03-10",
    "data_inicio_categoria_x": "",
    "data_inicio_categoria_x_iso": null,
    "data_inicio_categoria_a": "20090113",
    "data_inicio_categoria_a_iso": "2009-01-13",
    "data_inicio_categoria_b": "19780125",
    "data_inicio_categoria_b_iso": "1978-01-25",
    "data_inicio_categoria_c": "",
    "data_inicio_categoria_c_iso": null,
    "data_inicio_categoria_d": "",
    "data_inicio_categoria_d_iso": null,
    "data_inicio_categoria_e": "",
    "data_inicio_categoria_e_iso": null,
    "proximo_motivo_requerimento": "",
    "data_coleta_tox": "",
    "data_coleta_tox_iso": null,
    "data_validade_tox": "",
    "data_validade_tox_iso": null,
    "situacao_exame_tox": "0",
    "cnpj_laboratorio": "",
    "numero_laudo": "",
    "data_prazo_realizacao_tox": "",
    "data_prazo_realizacao_tox_iso": null,
    "data_coleta_novo_exame": "",
    "data_coleta_novo_exame_iso": null,
    "qtd_partes_consulta": "00",
    "parte_consulta": "00"
  },
  "registro_nacional_estrangeiro": null,
  "habilitacao_estrangeira": null,
  "qtd_registros": "2",
  "qtd_eventos": 2,
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
      "cpf_examinador2": "",
      "cnpj_entidade_creden": "19295546000145",
      "cod_municipio_exame": "07535",
      "cod_municipio_exame_descricao": "CURITIBA/PR",
      "uf_exame": "PR",
      "cat_pretendida": "AB",
      "cat_permitida": "AB",
      "observacoes": "99",
      "restricoes_x": ""
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
      "codigo_descricao": "INCLUSÃO - ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH",
      "modalidade": "1",
      "modalidade_descricao": "PRESENCIAL (Integral)",
      "num_certificado": "",
      "data_inicio": "20090110",
      "data_inicio_iso": "2009-01-10",
      "data_fim": null,
      "data_fim_iso": null,
      "carga_horaria": "000",
      "cnpj_entidade": "09199593000131",
      "cpf_instrutor": "",
      "cod_municipio_curso": "00000",
      "uf_curso": "PR",
      "data_validade": "",
      "data_validade_iso": null,
      "categoria": "",
      "observacoes_curso": "99"
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
      "codigo_descricao": "INCLUSÃO - ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH",
      "modalidade": "1",
      "modalidade_descricao": "PRESENCIAL (Integral)",
      "num_certificado": "",
      "data_inicio": "20090110",
      "data_inicio_iso": "2009-01-10",
      "data_fim": null,
      "data_fim_iso": null,
      "carga_horaria": "000",
      "cnpj_entidade": "09199593000131",
      "cpf_instrutor": "",
      "cod_municipio_curso": "00000",
      "uf_curso": "PR",
      "data_validade": "",
      "data_validade_iso": null,
      "categoria": "",
      "observacoes_curso": "99"
    }
  ],
  "impedimentos": [],
  "ocorrencias": [],
  "infracoes": [],
  "liberacoes": [],
  "escolas": [],
  "api_central": {
    "api_utilizada": "renach_prontuario",
    "parametro_utilizado": "cpf",
    "query_fornecida": "96238550953",
    "timestamp": "2026-11-19 14:52:05"
  }
};

console.log('--- TESTE DO PRODUTO E23 NO CATALOGO ---');
const prod = findServerProduct('E23');
console.log('1. Produto encontrado por código E23:', prod?.code, prod?.name);
console.log('   Custo:', prod?.defaultCost, 'Venda:', prod?.defaultPrice);

const prodSlug = findServerProduct('ren_jus_2026');
console.log('2. Produto encontrado por alias ren_jus_2026:', prodSlug?.code);

const prodRenach = findServerProduct('renach_prontuario');
console.log('3. Produto encontrado por apiPrimary renach_prontuario:', prodRenach?.code);

console.log('\n--- TESTE DO NORMALIZADOR E23 ---');
const result = normalizeProductResult('E23', samplePayload, '96238550953');
console.log('4. Total registros:', result.totalRegistros);
console.log('5. Condutor:', result.dados?.condutor?.nome, 'CPF:', result.dados?.condutor?.cpf);
console.log('   Data Nasc Formatada:', result.dados?.condutor?.dataNascimento);
console.log('6. CNH Registro:', result.dados?.condutor?.num_registro, 'RENACH:', result.dados?.condutor?.num_renach);
console.log('   Validade CNH:', result.dados?.cnh?.validade, 'Vencida:', result.dados?.cnh?.isValidadeVencida);
console.log('7. Celular Formatado:', result.dados?.contato?.telefoneFormatado);
console.log('8. Categorias Historico:', JSON.stringify(result.dados?.controle?.categoriasHistorico));
console.log('9. Exames:', result.dados?.exames?.length, 'primeiro:', result.dados?.exames?.[0]?.descricaoExame, 'Resultado:', result.dados?.exames?.[0]?.resultado);
console.log('10. Cursos:', result.dados?.cursos?.length, 'primeiro:', result.dados?.cursos?.[0]?.descricaoCurso, 'Modalidade:', result.dados?.cursos?.[0]?.modalidade);

console.log('\n--- TESTE DE WHITELABEL (ZERO VAZAMENTO DE FORNECEDOR) ---');
const hasApiCentral = 'api_central' in result.dados;
const hasFornecedor = 'fornecedor' in result.dados;
const hasToken = 'token' in result.dados;
console.log('11. Chave api_central suprimida?', !hasApiCentral ? 'SIM (OK)' : 'NAO (FALHA)');
console.log('12. Chave fornecedor suprimida?', !hasFornecedor ? 'SIM (OK)' : 'NAO (FALHA)');
console.log('13. Chave token suprimida?', !hasToken ? 'SIM (OK)' : 'NAO (FALHA)');

if (!hasApiCentral && !hasFornecedor && !hasToken && result.totalRegistros === 1 && prod?.defaultCost === 0.20 && prod?.defaultPrice === 1.32) {
  console.log('\n>>> TODOS OS TESTES PASSARAM COM SUCESSO! PRODUTO E23 VALIDADO 100% <<<');
} else {
  console.error('\n>>> FALHA NA VALIDAÇÃO DO PRODUTO E23 <<<');
  process.exit(1);
}
