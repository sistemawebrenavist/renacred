import axios from 'axios';
import { logger } from '../utils/logger';
import { infoPool } from './syncToInfosinistrosService';

interface CnpjCacheEntry {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnae?: string | null;
  cnaeDescricao?: string | null;
  timestamp: number;
}

export interface CnpjResolution {
  razaoSocial: string | null;
  nomeFantasia?: string | null;
  cnae?: string | null;
  cnaeDescricao?: string | null;
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
 * Resolve a Razão Social oficial e CNAE de um CNPJ consultando:
 * 1. Cache em memória (0ms)
 * 2. Banco de dados local/InfoSinistros (1-5ms)
 * 3. BrasilAPI - Receita Federal Oficial (~100-300ms)
 * 4. ReceitaWS (Contingência)
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
      cnaeDescricao: cached.cnaeDescricao
    };
  }

  // 2. Consulta no banco de dados InfoSinistros / histórico já gravado
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
        const razao = String(dbRes.rows[0].nome).trim().toUpperCase();
        cnpjCache.set(doc, { razaoSocial: razao, timestamp: Date.now() });
        return { razaoSocial: razao };
      }
    }
  } catch (err: any) {
    logger.warn(`[CNPJ SERVICE] Erro ao consultar banco local para CNPJ ${doc}: ${err.message}`);
  }

  // 3. Consulta BrasilAPI (Receita Federal)
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${doc}`, {
      timeout: 3500,
      headers: {
        'User-Agent': 'Renacred/1.0 (Auditoria Veicular e Cartoraria)',
      },
    });

    const data = response.data;
    const razaoSocial = (data.razao_social || data.nome || '').trim().toUpperCase();
    const nomeFantasia = (data.nome_fantasia || '').trim().toUpperCase() || null;
    const cnae = data.cnae_fiscal ? String(data.cnae_fiscal) : null;
    const cnaeDescricao = (data.cnae_fiscal_descricao || '').trim().toUpperCase() || null;

    if (razaoSocial) {
      cnpjCache.set(doc, { razaoSocial, nomeFantasia, cnae, cnaeDescricao, timestamp: Date.now() });
      logger.info(`[CNPJ SERVICE] Razão Social resolvida via BrasilAPI para ${doc}: ${razaoSocial} (CNAE: ${cnae})`);
      return { razaoSocial, nomeFantasia, cnae, cnaeDescricao };
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
      if (data && data.status !== 'ERROR' && data.nome) {
        const razaoSocial = String(data.nome).trim().toUpperCase();
        const nomeFantasia = (data.fantasia || '').trim().toUpperCase() || null;
        const cnae = data.atividade_principal?.[0]?.code ? String(data.atividade_principal[0].code).replace(/\D/g, '') : null;
        const cnaeDescricao = (data.atividade_principal?.[0]?.text || '').trim().toUpperCase() || null;
        cnpjCache.set(doc, { razaoSocial, nomeFantasia, cnae, cnaeDescricao, timestamp: Date.now() });
        logger.info(`[CNPJ SERVICE] Razão Social resolvida via ReceitaWS para ${doc}: ${razaoSocial} (CNAE: ${cnae})`);
        return { razaoSocial, nomeFantasia, cnae, cnaeDescricao };
      }
    } catch {
      // Ignora erro da contingência
    }
    logger.warn(`[CNPJ SERVICE] Falha ao resolver Razão Social para ${doc}: ${err.message}`);
  }

  return { razaoSocial: null };
}

/**
 * Enriquece uma lista de proprietários veiculares ou payload do Produto E2,
 * preenchendo automaticamente a Razão Social e CNAE quando for Pessoa Jurídica / CNPJ.
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
      }
    }
  }
}
