import pg from 'pg';
import crypto from 'crypto';

// Suporte para logger do Renacred ou fallback para console
let appLogger: any = console;
try {
  // @ts-ignore
  appLogger = require('../utils/logger').logger || console;
} catch {
  appLogger = {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args)
  };
}

// Pool de conexão direta com o banco da InfoSinistros (mesma VPS / localhost:5432)
const infosinistrosDbUrl =
  process.env.INFOSINISTROS_DATABASE_URL ||
  'postgresql://infosinistros_user:Infosinistros2025Secure@localhost:5432/infosinistros_production?schema=public';

const PoolClass: any = (pg as any).Pool || (pg as any).default?.Pool || pg;
export const infoPool: any = new PoolClass({
  connectionString: infosinistrosDbUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

if (typeof infoPool.on === 'function') {
  infoPool.on('error', (err: any) => {
    appLogger.error(`[SYNC INFOSINISTROS] Erro de conexão no pool PostgreSQL: ${err.message}`);
  });
}

export interface ProprietarioInput {
  documento?: string;
  cpfcnpj?: string;
  nome?: string;
  razao_social?: string;
  data?: string; // DD/MM/AAAA ou ISO
  hora?: string;
  uf?: string;
  municipio?: string;
  cidade?: string;
  evento?: string;
  atual?: boolean;
}

export interface SyncPayload {
  placa?: string;
  renavam?: string;
  historico?: ProprietarioInput[];
  proprietario_atual?: ProprietarioInput;
  dados?: any;
  raw?: any;
}

/**
 * Extrai o ano numérico e data completa a partir de strings de data variadas (DD/MM/AAAA, AAAA-MM-DD, etc)
 */
function extrairDataEAno(dataStr?: string, horaStr?: string): { ano: number; timestampDate: Date | null } {
  const currentYear = new Date().getFullYear();
  if (!dataStr) return { ano: currentYear, timestampDate: null };

  const clean = String(dataStr).trim();
  let ano = currentYear;
  let timestampDate: Date | null = null;

  try {
    if (clean.includes('/')) {
      const partes = clean.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const parsedAno = parseInt(partes[2], 10);
        if (!isNaN(parsedAno) && parsedAno > 1900 && parsedAno < 2100) {
          ano = parsedAno;
          let h = 0, m = 0, s = 0;
          if (horaStr && typeof horaStr === 'string' && horaStr.includes(':')) {
            const hPartes = horaStr.trim().split(':');
            h = parseInt(hPartes[0], 10) || 0;
            m = parseInt(hPartes[1], 10) || 0;
            s = parseInt(hPartes[2], 10) || 0;
          }
          timestampDate = new Date(ano, mes, dia, h, m, s);
        }
      }
    } else if (clean.includes('-')) {
      const partes = clean.split('-');
      if (partes.length >= 1) {
        const parsedAno = parseInt(partes[0], 10);
        if (!isNaN(parsedAno) && parsedAno > 1900 && parsedAno < 2100) {
          ano = parsedAno;
          timestampDate = new Date(clean);
        }
      }
    } else {
      const matchAno = clean.match(/\b(19\d{2}|20\d{2})\b/);
      if (matchAno) {
        ano = parseInt(matchAno[0], 10);
      }
    }
  } catch {
    ano = currentYear;
    timestampDate = null;
  }

  return { ano, timestampDate };
}

/**
 * Sincroniza em tempo real os proprietários consultados na Renacred para a base da InfoSinistros
 */
export async function syncVeicularToInfosinistros(
  placaInput: string,
  payload: SyncPayload | any
): Promise<{ success: boolean; totalInseridos: number }> {
  if (!placaInput || !payload) {
    return { success: false, totalInseridos: 0 };
  }

  const cleanPlaca = String(placaInput).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const rawRenavam = payload.renavam || payload.dados?.renavam || payload.raw?.renavam || payload.resultData?.renavam;
  const cleanRenavam = rawRenavam ? String(rawRenavam).replace(/\D/g, '') : null;

  // Extrair histórico e proprietário atual de qualquer formato (FetchBrasil direto, normalizado ou raw)
  const rawHistorico: ProprietarioInput[] =
    payload.historico ||
    payload.dados?.historico ||
    payload.raw?.historico ||
    payload.resultData?.historico ||
    [];

  const rawPropAtual: ProprietarioInput | undefined =
    payload.proprietario_atual ||
    payload.dados?.proprietario_atual ||
    payload.raw?.proprietario_atual ||
    payload.resultData?.proprietario_atual;

  const listaItens: ProprietarioInput[] = [];
  const docsVistos = new Set<string>();

  if (Array.isArray(rawHistorico) && rawHistorico.length > 0) {
    for (const item of rawHistorico) {
      listaItens.push(item);
      const doc = String(item.documento || item.cpfcnpj || '').replace(/\D/g, '');
      if (doc) docsVistos.add(doc);
    }
  }

  if (rawPropAtual) {
    const docAtual = String(rawPropAtual.documento || rawPropAtual.cpfcnpj || '').replace(/\D/g, '');
    if (docAtual && !docsVistos.has(docAtual)) {
      listaItens.push(rawPropAtual);
    }
  }

  if (listaItens.length === 0) {
    return { success: true, totalInseridos: 0 };
  }

  let client: any = null;
  let totalInseridos = 0;

  try {
    client = await infoPool.connect();

    // 1. Tentar obter chassi da base veiculos_base_bin da InfoSinistros para enriquecer o registro
    let chassi: string | null = null;
    try {
      const chassiRes = await client.query(
        'SELECT chassi FROM veiculos_base_bin WHERE placa = $1 LIMIT 1',
        [cleanPlaca]
      );
      if (chassiRes.rows.length > 0 && chassiRes.rows[0].chassi) {
        chassi = chassiRes.rows[0].chassi.trim();
      }
    } catch {
      // Ignora erro se busca por chassi falhar
    }

    for (const item of listaItens) {
      const rawDoc = String(item.documento || item.cpfcnpj || '').trim();
      const docLimpo = rawDoc.replace(/\D/g, '');
      if (!docLimpo || docLimpo.length < 5) continue; // Pular registros sem documento válido

      const tipoDoc = docLimpo.length === 11 ? 'CPF' : docLimpo.length === 14 ? 'CNPJ' : 'DOC';
      const nomeFinal = String(item.nome || item.razao_social || 'PROPRIETARIO REGISTRADO').trim().toUpperCase();
      const ufFinal = String(item.uf || '').trim().toUpperCase() || null;
      const munFinal = String(item.municipio || item.cidade || '').trim().toUpperCase() || null;
      const { ano: anoPropriedade, timestampDate } = extrairDataEAno(item.data, item.hora);
      const uuid = crypto.randomUUID();

      const insertSql = `
        INSERT INTO historico_proprietarios (
          id, placa, chassi, renavam, cpfcnpj, tipodocumento, nome, uf, municipio, anopropriedade, datamovimentacao, fonte, createdat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'RENACRED', NOW()
        )
        ON CONFLICT (placa, cpfcnpj, anopropriedade)
        DO UPDATE SET
          nome = EXCLUDED.nome,
          chassi = COALESCE(EXCLUDED.chassi, historico_proprietarios.chassi),
          renavam = COALESCE(EXCLUDED.renavam, historico_proprietarios.renavam),
          uf = COALESCE(EXCLUDED.uf, historico_proprietarios.uf),
          municipio = COALESCE(EXCLUDED.municipio, historico_proprietarios.municipio),
          datamovimentacao = COALESCE(EXCLUDED.datamovimentacao, historico_proprietarios.datamovimentacao);
      `;

      await client.query(insertSql, [
        uuid,
        cleanPlaca,
        chassi,
        cleanRenavam,
        docLimpo,
        tipoDoc,
        nomeFinal,
        ufFinal,
        munFinal,
        anoPropriedade,
        timestampDate
      ]);
      totalInseridos++;
    }

    appLogger.info(`[SYNC INFOSINISTROS] Sincronização concluída para placa ${cleanPlaca}: ${totalInseridos} proprietário(s) gravado(s)`);
    return { success: true, totalInseridos };
  } catch (error: any) {
    appLogger.error(`[SYNC INFOSINISTROS] Falha ao sincronizar placa ${cleanPlaca} para InfoSinistros: ${error.message}`);
    return { success: false, totalInseridos };
  } finally {
    if (client) client.release();
  }
}
