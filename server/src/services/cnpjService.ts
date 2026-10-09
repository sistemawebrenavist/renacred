import axios from 'axios';
import { logger } from '../utils/logger';
import { infoPool } from './syncToInfosinistrosService';

interface CnpjCacheEntry {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnae?: string | null;
  cnaeDescricao?: string | null;
  naturezaJuridica?: string | null;
  codigoNaturezaJuridica?: string | null;
  timestamp: number;
}

export interface CnpjResolution {
  razaoSocial: string | null;
  nomeFantasia?: string | null;
  cnae?: string | null;
  cnaeDescricao?: string | null;
  naturezaJuridica?: string | null;
  codigoNaturezaJuridica?: string | null;
}

// Cache em memória de 24 horas para resoluções de CNPJ (0ms)
const cnpjCache = new Map<string, CnpjCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Normaliza e limpa um CNPJ para apenas 14 dígitos numéricos
 */
export function cleanCnpj(doc?: string | null): string {
  if (!doc) return '';
  return String(doc).replace(/\D/g, '');
}

/**
 * Verifica se um documento é um CNPJ válido (14 dígitos)
 */
export function isCnpj(doc?: string | null): boolean {
  const cleaned = cleanCnpj(doc);
  return cleaned.length === 14;
}

/**
 * Limpa e valida um código de CNAE (descarta zeros ou máscaras inúteis)
 */
function sanitizarCnae(cnae?: any): string | null {
  if (!cnae) return null;
  const limpo = String(cnae).replace(/\D/g, '');
  if (!limpo || limpo === '0000000' || /^0+$/.test(limpo) || String(cnae).includes('*')) {
    return null;
  }
  return limpo;
}

/**
 * Limpa e valida a descrição do CNAE (descarta máscaras com asterisco ou não informada)
 */
function sanitizarCnaeDescricao(desc?: any): string | null {
  if (!desc) return null;
  const limpo = String(desc).trim().toUpperCase();
  if (!limpo || limpo.includes('*') || limpo.includes('NAO INFORMAD') || limpo.includes('NÃO INFORMAD')) {
    return null;
  }
  return limpo;
}

/**
 * Resolve a Razão Social oficial, CNAE e Natureza Jurídica de um CNPJ consultando:
 * 1. Cache em memória (0ms)
 * 2. BrasilAPI - Receita Federal Oficial (~100-300ms)
 * 3. ReceitaWS (Contingência)
 * 4. Banco de dados local/InfoSinistros (fallback de nome)
 */
export async function resolveCnpjRazaoSocial(cnpj: string): Promise<CnpjResolution> {
  const doc = cleanCnpj(cnpj);
  if (doc.length !== 14) {
    return { razaoSocial: null };
  }

  // 1. Cache em memória
  const cached = cnpjCache.get(doc);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      razaoSocial: cached.razaoSocial,
      nomeFantasia: cached.nomeFantasia,
      cnae: cached.cnae,
      cnaeDescricao: cached.cnaeDescricao,
      naturezaJuridica: cached.naturezaJuridica,
      codigoNaturezaJuridica: cached.codigoNaturezaJuridica
    };
  }

  // 2. Consulta de contingência no banco local historico_proprietarios (apenas para fallback de nome)
  let fallbackDbNome: string | null = null;
  try {
    if (infoPool && typeof infoPool.query === 'function') {
      const dbRes = await infoPool.query(
        `SELECT nome FROM historico_proprietarios 
         WHERE cpfcnpj = $1 
           AND nome IS NOT NULL 
           AND nome != '' 
           AND nome != 'PROPRIETARIO REGISTRADO' 
           AND nome NOT ILIKE '%NAO INFORMADO%' 
         ORDER BY createdat DESC 
         LIMIT 1`,
        [doc]
      );

      if (dbRes.rows.length > 0 && dbRes.rows[0].nome) {
        fallbackDbNome = String(dbRes.rows[0].nome).trim().toUpperCase();
      }
    }
  } catch (err: any) {
    logger.warn(`[CNPJ SERVICE] Erro ao consultar banco local para CNPJ ${doc}: ${err.message}`);
  }

  // 3. Consulta BrasilAPI (Receita Federal Oficial)
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${doc}`, {
      timeout: 3500,
      headers: {
        'User-Agent': 'Renacred/1.0 (Auditoria Veicular e Cartoraria)',
      },
    });

    const data = response.data;
    const razaoSocial = (data.razao_social || data.nome || fallbackDbNome || '').trim().toUpperCase();
    const nomeFantasia = (data.nome_fantasia || '').trim().toUpperCase() || null;
    const cnae = sanitizarCnae(data.cnae_fiscal);
    const cnaeDescricao = sanitizarCnaeDescricao(data.cnae_fiscal_descricao);

    const codNatRaw = data.codigo_natureza_juridica ? String(data.codigo_natureza_juridica).replace(/\D/g, '') : null;
    const natDescRaw = (data.natureza_juridica || '').trim().toUpperCase() || null;
    const codigoNaturezaJuridica = codNatRaw || (natDescRaw ? (natDescRaw.match(/^(\d{3,4}|\d{3}-\d)/)?.[0]?.replace(/\D/g, '') || null) : null);
    const naturezaJuridica = natDescRaw;

    if (razaoSocial) {
      cnpjCache.set(doc, {
        razaoSocial,
        nomeFantasia,
        cnae,
        cnaeDescricao,
        naturezaJuridica,
        codigoNaturezaJuridica,
        timestamp: Date.now()
      });
      logger.info(`[CNPJ SERVICE] Razão Social resolvida via BrasilAPI para ${doc}: ${razaoSocial} (Nat: ${naturezaJuridica || codigoNaturezaJuridica}, CNAE: ${cnae})`);
      return { razaoSocial, nomeFantasia, cnae, cnaeDescricao, naturezaJuridica, codigoNaturezaJuridica };
    }
  } catch (err: any) {
    // 4. Contingência: ReceitaWS
    try {
      const recRes = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${doc}`, {
        timeout: 3500,
        headers: {
          'User-Agent': 'Renacred/1.0',
        },
      });
      const data = recRes.data;
      if (data && data.status !== 'ERROR' && (data.nome || fallbackDbNome)) {
        const razaoSocial = String(data.nome || fallbackDbNome).trim().toUpperCase();
        const nomeFantasia = (data.fantasia || '').trim().toUpperCase() || null;
        const cnae = sanitizarCnae(data.atividade_principal?.[0]?.code);
        const cnaeDescricao = sanitizarCnaeDescricao(data.atividade_principal?.[0]?.text);

        const natRaw = (data.natureza_juridica || '').trim().toUpperCase() || null;
        const codigoNatMatch = natRaw ? natRaw.match(/^(\d{3,4}|\d{3}-\d)/) : null;
        const codigoNaturezaJuridica = codigoNatMatch ? codigoNatMatch[1].replace(/\D/g, '') : null;
        const naturezaJuridica = natRaw;

        cnpjCache.set(doc, {
          razaoSocial,
          nomeFantasia,
          cnae,
          cnaeDescricao,
          naturezaJuridica,
          codigoNaturezaJuridica,
          timestamp: Date.now()
        });
        logger.info(`[CNPJ SERVICE] Razão Social resolvida via ReceitaWS para ${doc}: ${razaoSocial} (Nat: ${naturezaJuridica || codigoNaturezaJuridica}, CNAE: ${cnae})`);
        return { razaoSocial, nomeFantasia, cnae, cnaeDescricao, naturezaJuridica, codigoNaturezaJuridica };
      }
    } catch {
      // Ignora erro da contingência
    }
    logger.warn(`[CNPJ SERVICE] Falha nas APIs externas para ${doc}: ${err.message}`);
  }

  // 5. Fallback final: usar nome salvo no banco local se as APIs externas falharem
  if (fallbackDbNome) {
    cnpjCache.set(doc, {
      razaoSocial: fallbackDbNome,
      timestamp: Date.now()
    });
    return { razaoSocial: fallbackDbNome };
  }

  return { razaoSocial: null };
}

/**
 * Enriquece uma lista de proprietários veiculares ou payload do Produto E2,
 * preenchendo automaticamente a Razão Social, Natureza Jurídica e CNAE quando for Pessoa Jurídica / CNPJ.
 */
export async function enrichProprietariosWithCnpj(data: any): Promise<void> {
  if (!data) return;

  const itemsToEnrich: Array<{ item: any; cnpj: string }> = [];

  const checkAndQueue = (target: any) => {
    if (!target) return;
    const rawDoc = target.documento || target.cpfcnpj || '';
    const clean = cleanCnpj(rawDoc);

    if (clean.length === 14) {
      itemsToEnrich.push({ item: target, cnpj: clean });
    }
  };

  // 1. Checar proprietário atual
  if (data.proprietario_atual) {
    checkAndQueue(data.proprietario_atual);
  }

  // 2. Checar itens do histórico
  if (Array.isArray(data.historico)) {
    for (const entry of data.historico) {
      checkAndQueue(entry);
    }
  }

  if (itemsToEnrich.length === 0) return;

  // 3. Agrupar CNPJs únicos para evitar requisições redundantes
  const uniqueCnpjs = Array.from(new Set(itemsToEnrich.map((e) => e.cnpj)));
  const results = await Promise.allSettled(uniqueCnpjs.map((c) => resolveCnpjRazaoSocial(c)));

  const cnpjResolutionMap = new Map<string, CnpjResolution>();

  uniqueCnpjs.forEach((cnpj, idx) => {
    const res = results[idx];
    if (res.status === 'fulfilled' && res.value?.razaoSocial) {
      cnpjResolutionMap.set(cnpj, res.value);
    }
  });

  // 4. Aplicar enriquecimento aos itens
  for (const { item, cnpj } of itemsToEnrich) {
    const res = cnpjResolutionMap.get(cnpj);
    if (res) {
      const currentNome = (item.nome || item.razao_social || '').trim();
      const isMissingName =
        !currentNome ||
        currentNome.toUpperCase().includes('NÃO INFORMADO') ||
        currentNome.toUpperCase().includes('NAO INFORMADO') ||
        currentNome.toUpperCase() === 'PROPRIETARIO REGISTRADO' ||
        currentNome.toUpperCase() === 'NAO CONSTA';

      if (isMissingName && res.razaoSocial) {
        item.nome = res.razaoSocial;
        item.razao_social = res.razaoSocial;
      }
      if (res.nomeFantasia && !item.nome_fantasia) {
        item.nome_fantasia = res.nomeFantasia;
      }
      if (res.cnae) {
        item.cnae = res.cnae;
      }
      if (res.cnaeDescricao) {
        item.cnae_descricao = res.cnaeDescricao;
        item.cnaeDescricao = res.cnaeDescricao;
      }
      if (res.naturezaJuridica) {
        item.natureza_juridica = res.naturezaJuridica;
        item.naturezaJuridica = res.naturezaJuridica;
      }
      if (res.codigoNaturezaJuridica) {
        item.codigo_natureza_juridica = res.codigoNaturezaJuridica;
        item.codigoNaturezaJuridica = res.codigoNaturezaJuridica;
      }
    }
  }
}
