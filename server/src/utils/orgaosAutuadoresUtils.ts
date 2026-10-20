import orgaosDictionary from './orgaosAutuadoresDictionary.json';

const orgaosMap = orgaosDictionary as Record<string, string>;

export interface OrgaoAutuadorInfo {
  codigo?: string;
  descricao: string;
  nomeExibicao: string;
  uf?: string;
}

const UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

/**
 * Traduz e formata código de Órgão Autuador (RENAINF / Detran)
 * Baseado na Tabela Nacional de Órgãos Autuadores
 */
export function translateOrgaoAutuador(
  rawOrgao?: string | number | null,
  codigoFallback?: string | number | null
): OrgaoAutuadorInfo | null {
  if (rawOrgao === undefined || rawOrgao === null || rawOrgao === '') {
    if (codigoFallback !== undefined && codigoFallback !== null && codigoFallback !== '') {
      return translateOrgaoAutuador(codigoFallback);
    }
    return null;
  }

  const rawStr = String(rawOrgao).trim();
  if (rawStr === '-' || rawStr.toUpperCase() === 'NULL' || rawStr.toUpperCase() === 'UNDEFINED') {
    return null;
  }

  // 1. Verificar se é puramente numérico (código do órgão autuador)
  const isNumeric = /^\d+$/.test(rawStr);

  if (isNumeric) {
    const paddedCode = rawStr.padStart(6, '0');
    const matchedDesc = orgaosMap[paddedCode] || orgaosMap[rawStr];

    if (matchedDesc) {
      const words = matchedDesc.split(' ');
      const lastWord = words[words.length - 1];
      const uf = UFS.has(lastWord) ? lastWord : undefined;

      return {
        codigo: paddedCode,
        descricao: matchedDesc,
        nomeExibicao: matchedDesc,
        uf
      };
    }

    // Código numérico não encontrado no dicionário
    return {
      codigo: rawStr,
      descricao: `Órgão Autuador (${rawStr})`,
      nomeExibicao: `Órgão Autuador (${rawStr})`
    };
  }

  // 2. Se já vier em formato textual ou texto com código misto
  // Ex: "271070 - PREFEITURA DE SAO PAULO" ou "271070 PREFEITURA..."
  const prefixMatch = rawStr.match(/^(\d{5,6})\s*[-:]?\s*(.+)$/);
  if (prefixMatch) {
    const code = prefixMatch[1].padStart(6, '0');
    const rest = prefixMatch[2].trim();
    const matchedDesc = orgaosMap[code] || rest;
    const words = matchedDesc.split(' ');
    const lastWord = words[words.length - 1];
    const uf = UFS.has(lastWord) ? lastWord : undefined;

    return {
      codigo: code,
      descricao: matchedDesc,
      nomeExibicao: matchedDesc,
      uf
    };
  }

  // Se já for descrição textual direta (ex: "DETRAN SP", "PREFEITURA MUNICIPAL DE SAO PAULO SP")
  const words = rawStr.split(' ');
  const lastWord = words[words.length - 1].toUpperCase();
  const uf = UFS.has(lastWord) ? lastWord : undefined;
  const fallbackStr = codigoFallback ? String(codigoFallback).trim().padStart(6, '0') : undefined;

  return {
    codigo: fallbackStr,
    descricao: rawStr,
    nomeExibicao: rawStr,
    uf
  };
}

/**
 * Retorna string descritiva formatada do órgão autuador
 */
export function formatOrgaoAutuador(
  rawOrgao?: string | number | null,
  codigoFallback?: string | number | null
): string {
  const info = translateOrgaoAutuador(rawOrgao, codigoFallback);
  return info ? info.descricao : String(rawOrgao || '-');
}
