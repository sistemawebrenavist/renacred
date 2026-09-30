import cboDictionary from './cboDictionary.json';

export interface MosaicInfo {
  codigo: string;
  grupoCodigo: string;
  grupoNome: string;
  segmento: string;
  descricaoCompleta: string;
}

export interface CBOInfo {
  codigo: string;
  titulo: string;
  formatado: string;
}

export const MOSAIC_GRUPOS: Record<string, string> = {
  A: 'Elites Brasileiras',
  B: 'Experientes Urbanos de Vida Confortável',
  C: 'Juventude Trabalhadora Urbana',
  D: 'Jovens da Periferia',
  E: 'Adultos Urbanos Estabelecidos',
  F: 'Envelhecendo no Século XXI',
  G: 'Donos de Negócio',
  H: 'Massa Trabalhadora Urbana',
  I: 'Moradores de Áreas Empobrecidas do Sul e do Sudeste',
  J: 'Habitantes de Zonas Precárias',
  K: 'Habitantes de Áreas Rurais',
};

export const MOSAIC_SEGMENTOS: Record<string, { grupo: string; segmento: string }> = {
  // Grupo A
  A01: { grupo: 'A', segmento: 'Ricos e influentes' },
  A02: { grupo: 'A', segmento: 'Elite urbana qualificada' },
  // Grupo B
  B03: { grupo: 'B', segmento: 'Idosos tradicionais de alto padrão' },
  B04: { grupo: 'B', segmento: 'A caminho da aposentadoria nas melhores cidades' },
  B05: { grupo: 'B', segmento: 'Assalariados de meia-idade das grandes cidades' },
  // Grupo C
  C06: { grupo: 'C', segmento: 'Construindo uma carreira promissora' },
  C07: { grupo: 'C', segmento: 'Jovens dependentes do interior' },
  C08: { grupo: 'C', segmento: 'Jovens protagonistas da classe média' },
  // Grupo D
  D09: { grupo: 'D', segmento: 'Seguindo a vida na periferia' },
  D10: { grupo: 'D', segmento: 'No coração da periferia' },
  D11: { grupo: 'D', segmento: 'Novos moradores da comunidade' },
  D12: { grupo: 'D', segmento: 'Trabalhadores vizinhos da grande cidade' },
  D13: { grupo: 'D', segmento: 'Independência na casa dos pais' },
  D14: { grupo: 'D', segmento: 'Juventude de baixa renda no interior urbano' },
  // Grupo E
  E15: { grupo: 'E', segmento: 'Esticando a renda' },
  E16: { grupo: 'E', segmento: 'Amadurecendo confortavelmente no interior' },
  E17: { grupo: 'E', segmento: 'Ascendentes do bairro' },
  E18: { grupo: 'E', segmento: 'Operários da vila' },
  // Grupo F
  F19: { grupo: 'F', segmento: 'Idosos independentes da classe média' },
  F20: { grupo: 'F', segmento: 'Jovens idosos urbanos e dinâmicos' },
  F21: { grupo: 'F', segmento: 'Idosos remediados do interior' },
  // Grupo G
  G22: { grupo: 'G', segmento: 'Empresários estabilizados' },
  G23: { grupo: 'G', segmento: 'Jovens empreendedores e ousados' },
  G24: { grupo: 'G', segmento: 'Pequenos negociantes do interior' },
  // Grupo H
  H25: { grupo: 'H', segmento: 'Carteira assinada nas regiões metropolitanas' },
  H26: { grupo: 'H', segmento: 'Trabalhadores manuais de baixa remuneração' },
  H27: { grupo: 'H', segmento: 'Prestadores de serviços nas regiões metropolitanas' },
  H28: { grupo: 'H', segmento: 'Jovens da informalidade' },
  H29: { grupo: 'H', segmento: 'Comunidades do litoral' },
  // Grupo I
  I30: { grupo: 'I', segmento: 'Envelhecendo com simplicidade' },
  I31: { grupo: 'I', segmento: 'Periferia jovem do interior' },
  I32: { grupo: 'I', segmento: 'Comunidade madura' },
  // Grupo J
  J33: { grupo: 'J', segmento: 'Jovens desprovidos' },
  J34: { grupo: 'J', segmento: 'Adultos vulneráveis' },
  // Grupo K
  K35: { grupo: 'K', segmento: 'Pedacinho de terra' },
  K36: { grupo: 'K', segmento: 'Jovens trabalhadores do agronegócio' },
  K37: { grupo: 'K', segmento: 'Saudade da roça' },
  K38: { grupo: 'K', segmento: 'Juventude do Norte e do Nordeste rural' },
  K39: { grupo: 'K', segmento: 'Idosos da agricultura familiar do Norte e do Nordeste' },
  K40: { grupo: 'K', segmento: 'Sertão profundo' },
};

const cboMap = cboDictionary as Record<string, string>;

/**
 * Traduz e formata código CBO oficial com título da ocupação
 */
export function translateCBO(rawCode?: string | number | null): CBOInfo | null {
  if (!rawCode) return null;
  const str = String(rawCode).trim();
  if (!str || str === '-' || str.toUpperCase() === 'NULL' || str.toUpperCase() === 'UNDEFINED') return null;

  const cleanDigits = str.replace(/\D/g, '');
  let foundTitle = cboMap[str] || cboMap[cleanDigits];

  if (!foundTitle && cleanDigits.length > 0 && cleanDigits.length < 6) {
    const padded = cleanDigits.padStart(6, '0');
    foundTitle = cboMap[padded];
  }

  let codigoFormatado = str;
  if (cleanDigits.length === 6) {
    codigoFormatado = `${cleanDigits.substring(0, 4)}-${cleanDigits.substring(4)}`;
  }

  if (foundTitle) {
    return {
      codigo: codigoFormatado,
      titulo: foundTitle,
      formatado: `${codigoFormatado} - ${foundTitle}`
    };
  }

  return {
    codigo: codigoFormatado,
    titulo: str,
    formatado: str
  };
}

/**
 * Traduz e formata código Mosaic para Perfil Socioeconômico com Grupo e Segmento
 */
export function translateMosaic(rawCode?: string | number | null): MosaicInfo | null {
  if (!rawCode) return null;
  const str = String(rawCode).trim().toUpperCase();
  if (!str || str === '-' || str === 'NULL' || str === 'UNDEFINED') return null;

  // 1. Tentar correspondência direta em MOSAIC_SEGMENTOS
  if (MOSAIC_SEGMENTOS[str]) {
    const item = MOSAIC_SEGMENTOS[str];
    const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
    return {
      codigo: str,
      grupoCodigo: item.grupo,
      grupoNome,
      segmento: item.segmento,
      descricaoCompleta: `${str} - ${item.segmento} (${grupoNome})`
    };
  }

  // 2. Se for número puro (1 a 40)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 40) {
    const segKeys = Object.keys(MOSAIC_SEGMENTOS);
    const key = segKeys[num - 1];
    if (key) {
      const item = MOSAIC_SEGMENTOS[key];
      const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
      return {
        codigo: key,
        grupoCodigo: item.grupo,
        grupoNome,
        segmento: item.segmento,
        descricaoCompleta: `${key} - ${item.segmento} (${grupoNome})`
      };
    }
  }

  // 3. Se for código com 1 dígito numérico após letra (ex: A1 -> A01, D9 -> D09)
  const letterMatch = str.match(/^([A-K])(\d{1})$/);
  if (letterMatch) {
    const paddedKey = `${letterMatch[1]}0${letterMatch[2]}`;
    if (MOSAIC_SEGMENTOS[paddedKey]) {
      const item = MOSAIC_SEGMENTOS[paddedKey];
      const grupoNome = MOSAIC_GRUPOS[item.grupo] || `Grupo ${item.grupo}`;
      return {
        codigo: paddedKey,
        grupoCodigo: item.grupo,
        grupoNome,
        segmento: item.segmento,
        descricaoCompleta: `${paddedKey} - ${item.segmento} (${grupoNome})`
      };
    }
  }

  // 4. Se for apenas a letra do grupo (ex: 'A', 'B', 'GRUPO A')
  const cleanGrupo = str.replace(/^GRUPO\s*/, '').trim();
  if (MOSAIC_GRUPOS[cleanGrupo]) {
    const grupoNome = MOSAIC_GRUPOS[cleanGrupo];
    return {
      codigo: cleanGrupo,
      grupoCodigo: cleanGrupo,
      grupoNome,
      segmento: grupoNome,
      descricaoCompleta: `Grupo ${cleanGrupo} - ${grupoNome}`
    };
  }

  // 5. Se já vier descritivo ou não catalogado
  return {
    codigo: str,
    grupoCodigo: '',
    grupoNome: '',
    segmento: str,
    descricaoCompleta: str
  };
}
