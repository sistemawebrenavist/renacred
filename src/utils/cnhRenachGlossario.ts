/**
 * Glossário Técnico e Dicionário de Códigos Oficiais do RENACH / DETRAN
 * Sistema Nacional de Trânsito - Plataforma Renacred
 */

// Tabela de Situação da CNH (situacao_codigo / situacao_anterior)
export const SITUACOES_CNH: Record<string, string> = {
  '1': 'EMITIDA',
  '2': 'CANCELADA',
  '3': 'SUSPENSA',
  '4': 'CONFIRMADA',
  '5': 'CASSADA',
  '6': 'ALTERADA',
  '7': 'BLOQUEADA JUDICIALMENTE',
  '8': 'AGUARDANDO RETIRADA',
  '9': 'EM PROCESSAMENTO'
};

// Tabela de Motivos de Requerimento da CNH
export const MOTIVOS_REQUERIMENTO_CNH: Record<string, string> = {
  '1': 'PRIMEIRA HABILITAÇÃO',
  '2': 'ADIÇÃO DE CATEGORIA',
  '3': 'MUDANÇA DE CATEGORIA',
  '4': 'SEGUNDA VIA DE CNH',
  '5': 'RENOVAÇÃO DE EXAMES',
  '6': 'REABILITAÇÃO DE CONDUTOR',
  '7': 'TRANSFERÊNCIA DE DOMICÍLIO',
  '8': 'ALTERAÇÃO DE DADOS CADASTRAIS',
  '9': 'SUBSTITUIÇÃO DE PERMISSÃO P/ DEFINITIVA'
};

// Tabela de Tipos de Eventos
export const TIPOS_EVENTOS_RENACH: Record<string, string> = {
  'E': 'EXAME MÉDICO / PERICIAL',
  'C': 'CURSO DE FORMAÇÃO / ATUALIZAÇÃO',
  'O': 'OCORRÊNCIA / APONTAMENTO',
  'I': 'IMPEDIMENTO ADMINISTRATIVO'
};

// Tabela de Tipos de Atualização de Eventos
export const TIPOS_ATUALIZACAO_RENACH: Record<string, string> = {
  'I': 'INCLUSÃO',
  'S': 'SUBSTITUIÇÃO',
  'E': 'EXCLUSÃO',
  'A': 'ALTERAÇÃO'
};

// Tabela de Exames Médicos / Clínicos
export const EXAMES_RENACH: Record<string, string> = {
  '01': 'AVALIAÇÃO PSICOLÓGICA (PSICOTÉCNICO)',
  '02': 'EXAME TEÓRICO-TÉCNICO',
  '03': 'APTIDÃO FÍSICA E MENTAL',
  '04': 'EXAME DE DIREÇÃO VEICULAR',
  '05': 'EXAME TOXICOLÓGICO DE LARGA JANELA'
};

// Tabela de Resultados de Exames
export const RESULTADOS_EXAME_RENACH: Record<string, string> = {
  '1': 'APTO',
  '2': 'INAPTO TEMPORÁRIO',
  '3': 'INAPTO DEFINITIVO',
  '4': 'APTO COM RESTRIÇÕES'
};

// Tabela de Cursos de Formação e Renovação
export const CURSOS_RENACH: Record<string, string> = {
  '30': 'ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH',
  '31': 'CURSO DE RECICLAGEM PARA CONDUTORES INFRATORES',
  '32': 'TRANSPORTE COLETIVO DE PASSAGEIROS',
  '33': 'TRANSPORTE DE ESCOLARES',
  '34': 'TRANSPORTE DE PRODUTOS PERIGOSOS (MOPP)',
  '35': 'CONDUTORES DE VEÍCULOS DE EMERGÊNCIA',
  '36': 'TRANSPORTE DE CARGA INDIVISÍVEL',
  '37': 'CONDUTOR DE MOTOTÁXI',
  '38': 'CONDUTOR DE MOTOFRETE'
};

// Tabela de Modalidades de Cursos
export const MODALIDADES_CURSO_RENACH: Record<string, string> = {
  '1': 'PRESENCIAL (Integral)',
  '2': 'PRESENCIAL (Modular)',
  '3': 'ENSINO A DISTÂNCIA (EAD Homologado SENATRAN)'
};

// Tabela de Tipos de Documento Civil
export const TIPOS_DOCUMENTO_CIVIL: Record<string, string> = {
  '1': 'CARTEIRA DE IDENTIDADE / RG',
  '2': 'CERTIDÃO DE NASCIMENTO',
  '3': 'CERTIDÃO DE CASAMENTO',
  '4': 'CARTEIRA DE TRABALHO (CTPS)',
  '5': 'PASSAPORTE',
  '6': 'CARTEIRA FUNCIONAL'
};

// Funções Utilitárias de Tradução Segura com Fallback
export function traduzirSituacaoCnh(codigo?: string | number | null): string {
  if (!codigo) return 'CONFIRMADA';
  const str = String(codigo).trim();
  return SITUACOES_CNH[str] || str;
}

export function traduzirMotivoRequerimento(codigo?: string | number | null): string {
  if (!codigo) return 'RENOVAÇÃO DE EXAMES';
  const str = String(codigo).trim();
  return MOTIVOS_REQUERIMENTO_CNH[str] || str;
}

export function traduzirResultadoExame(codigo?: string | number | null): string {
  if (!codigo) return 'APTO';
  const str = String(codigo).trim();
  return RESULTADOS_EXAME_RENACH[str] || (str.toUpperCase().includes('APTO') ? str : 'APTO');
}

export function traduzirExame(codigo?: string | number | null): string {
  if (!codigo) return 'APTIDÃO FÍSICA E MENTAL';
  const str = String(codigo).trim();
  const cleaned = str.replace(/^[SI]/, ''); // Se vier S03 ou I03, extrai 03
  return EXAMES_RENACH[cleaned] || EXAMES_RENACH[str] || str;
}

export function traduzirCurso(codigo?: string | number | null): string {
  if (!codigo) return 'ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH';
  const str = String(codigo).trim();
  const cleaned = str.replace(/^[SI]/, ''); // Se vier I30 ou S30, extrai 30
  return CURSOS_RENACH[cleaned] || CURSOS_RENACH[str] || str;
}

export function traduzirModalidade(codigo?: string | number | null): string {
  if (!codigo) return 'PRESENCIAL (Integral)';
  const str = String(codigo).trim();
  return MODALIDADES_CURSO_RENACH[str] || str;
}

export function traduzirTipoDocumento(codigo?: string | number | null): string {
  if (!codigo) return 'CARTEIRA DE IDENTIDADE / RG';
  const str = String(codigo).trim();
  return TIPOS_DOCUMENTO_CIVIL[str] || str;
}
