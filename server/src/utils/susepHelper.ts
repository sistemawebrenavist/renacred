import susepRaw from '../data/susep_seguradoras.json';

interface SusepEntry {
  CNPJ: string;
  SUSEP: string;
}

// Índices em memória O(1) para busca exata (14 dígitos) e por raiz de CNPJ (8 dígitos - matriz/filiais)
const susepPorCnpjExato = new Map<string, string>();
const susepPorCnpjRaiz = new Map<string, string>();

for (const item of susepRaw as SusepEntry[]) {
  const cnpjLimpo = String(item.CNPJ || '').replace(/\D/g, '');
  const susepLimpo = String(item.SUSEP || '').trim();
  if (cnpjLimpo.length === 14 && susepLimpo) {
    susepPorCnpjExato.set(cnpjLimpo, susepLimpo);
    const raiz = cnpjLimpo.substring(0, 8);
    if (!susepPorCnpjRaiz.has(raiz)) {
      susepPorCnpjRaiz.set(raiz, susepLimpo);
    }
  }
}

/**
 * Busca o código SUSEP (5 dígitos) pelo CNPJ da seguradora.
 * 1) Tenta correspondência exata nos 14 dígitos
 * 2) Fallback pela raiz de 8 dígitos (resolve filiais estaduais de seguradoras, ex: Zurich .../0078-00 -> matriz .../0001-21)
 */
export function buscarCodigoSusepPorCnpj(cnpj?: string | null): string | null {
  if (!cnpj) return null;
  const digits = String(cnpj).replace(/\D/g, '');
  if (digits.length !== 14) return null;

  const exato = susepPorCnpjExato.get(digits);
  if (exato) return exato;

  const raiz = digits.substring(0, 8);
  return susepPorCnpjRaiz.get(raiz) || null;
}

/**
 * Verifica se o CNPJ pertence a uma seguradora cadastrada na tabela oficial SUSEP
 */
export function isCnpjSeguradoraSusep(cnpj?: string | null): boolean {
  return buscarCodigoSusepPorCnpj(cnpj) !== null;
}

/**
 * Verifica se o CNAE informado corresponde a Seguradora Não-Vida (CNAE 6512-0/00)
 */
export function isCnaeSeguradoraNaoVida(cnae?: string | null, cnaeDescricao?: string | null): boolean {
  if (cnae) {
    const digits = String(cnae).replace(/\D/g, '');
    if (digits === '6512000' || digits.startsWith('6512')) {
      return true;
    }
  }
  if (cnaeDescricao) {
    const desc = String(cnaeDescricao)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    if (desc.includes('SEGUROS NAO-VIDA') || desc.includes('SEGUROS NAO VIDA')) {
      return true;
    }
  }
  return false;
}

/**
 * Heurística textual segura para identificação de seguradoras (exclui corretoras, assessorias e consultorias)
 */
export function isNomeSeguradora(nome?: string | null): boolean {
  if (!nome) return false;
  const upper = String(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (!upper) return false;

  // Excluir intermediários (corretoras, consultorias, assessorias, proteção veicular/associações)
  if (/\b(CORRETORA|CORRETAGEM|CONSULTORIA|ASSESSORIA|AGENCIA|ADMINISTRADORA|ASSOCIACAO|CLUBE DE BENEFICIOS)\b/.test(upper)) {
    return false;
  }

  return /\b(SEGURADORA|SEGUROS|CIA DE SEGUROS|COMPANHIA DE SEGUROS|SEGURO AUTO)\b/.test(upper);
}

/**
 * Formata CNPJ para 00.000.000/0000-00
 */
export function formatarCnpj(cnpj?: string | null): string {
  if (!cnpj) return '-';
  const d = String(cnpj).replace(/\D/g, '').padStart(14, '0');
  if (d.length !== 14) return String(cnpj).trim();
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/**
 * Máscara LGPD do Nome Completo do Segurado (BDVII - Bloco 03):
 * Mostra apenas o 1º nome; o restante das palavras é substituído por asteriscos.
 * Ex: "LILIAN DINIS MARTINS DURANTE" -> "LILIAN ***** ******* *******"
 */
export function mascararNomeSegurado(nome?: string | null): string {
  if (!nome) return 'NÃO INFORMADO';
  const limpo = String(nome).trim().replace(/\s+/g, ' ');
  if (!limpo || limpo.toUpperCase().includes('NAO INFORMAD') || limpo.toUpperCase().includes('NÃO INFORMAD')) {
    return 'NÃO INFORMADO';
  }
  const partes = limpo.split(' ');
  if (partes.length === 1) {
    return partes[0].toUpperCase();
  }
  const primeiroNome = partes[0].toUpperCase();
  const restanteMascarado = partes
    .slice(1)
    .map((p) => '*'.repeat(Math.max(p.length, 3)))
    .join(' ');
  return `${primeiroNome} ${restanteMascarado}`;
}

/**
 * Máscara LGPD do Documento do Segurado (BDVII - Bloco 03):
 * - Pessoa Física (CPF): mostra apenas os 3 primeiros dígitos e o restante com asteriscos (ex: 246.***.***-**)
 * - Pessoa Jurídica (CNPJ): mostra completo formatado (ex: 12.345.678/0001-90)
 */
export function mascararDocumentoSegurado(documento?: string | null): {
  tipoDocumento: 'CPF' | 'CNPJ' | 'NÃO INFORMADO';
  documentoMascarado: string;
} {
  if (!documento) {
    return { tipoDocumento: 'NÃO INFORMADO', documentoMascarado: 'NÃO INFORMADO' };
  }
  const digits = String(documento).replace(/\D/g, '');
  if (digits.length === 14) {
    return {
      tipoDocumento: 'CNPJ',
      documentoMascarado: formatarCnpj(digits)
    };
  }
  if (digits.length >= 11) {
    const cpf11 = digits.slice(-11);
    return {
      tipoDocumento: 'CPF',
      documentoMascarado: `${cpf11.slice(0, 3)}.***.***-**`
    };
  }
  if (digits.length >= 3) {
    return {
      tipoDocumento: 'CPF',
      documentoMascarado: `${digits.slice(0, 3)}.***.***-**`
    };
  }
  return { tipoDocumento: 'NÃO INFORMADO', documentoMascarado: 'NÃO INFORMADO' };
}

/**
 * Converte strings variadas de data (DD/MM/AAAA, YYYY-MM-DD, Date) em objeto Date UTC (meio-dia para evitar drift de fuso)
 */
export function parseDataFlexivel(valor?: string | Date | null): Date | null {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate(), 12, 0, 0));
  }
  const str = String(valor).trim();
  if (!str) return null;

  // DD/MM/AAAA
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10);
    const mes = parseInt(brMatch[2], 10) - 1;
    const ano = parseInt(brMatch[3], 10);
    const d = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }

  // AAAA-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10);
    const mes = parseInt(isoMatch[2], 10) - 1;
    const dia = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Formata Date para DD/MM/AAAA
 */
export function formatarDataBR(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) return null;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Calcula a Data do Sinistro BDVII: exatamente 30 dias corridos antes da data da posse da seguradora.
 */
export function calcularDataSinistro30DiasAntes(dataPosse?: string | Date | null): string | null {
  const posseDate = parseDataFlexivel(dataPosse);
  if (!posseDate) return null;
  const sinistroMs = posseDate.getTime() - 30 * 24 * 60 * 60 * 1000;
  return formatarDataBR(new Date(sinistroMs));
}

export function getTotalSeguradorasSusep(): number {
  return susepPorCnpjExato.size;
}
