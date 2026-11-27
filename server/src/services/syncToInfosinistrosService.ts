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
  chassi?: string;
  historico?: ProprietarioInput[];
  proprietario_atual?: ProprietarioInput;
  dados?: any;
  raw?: any;
  normalized?: any;
  resultData?: any;
  [key: string]: any;
}

/**
 * Procura um valor em múltiplas fontes e chaves possíveis
 */
function findValue(keys: string[], ...sources: any[]): any {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const k of keys) {
      const val = src[k];
      if (
        val !== undefined &&
        val !== null &&
        String(val).trim() !== '' &&
        String(val).trim().toLowerCase() !== 'null' &&
        String(val).trim().toLowerCase() !== 'undefined'
      ) {
        return val;
      }
    }
  }
  return null;
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
 * Sincroniza em tempo real qualquer resposta veicular (E12, E19, E2, E20, etc.)
 * para a base de dados interna da InfoSinistros (tabelas historico_proprietarios e veiculos_base_bin).
 */
export async function syncVeicularToInfosinistros(
  placaInput: string,
  payload: SyncPayload | any,
  productCode?: string
): Promise<{ success: boolean; totalInseridos: number }> {
  if (!placaInput && !payload) {
    return { success: false, totalInseridos: 0 };
  }

  // Montar pilha de fontes de busca de dados
  const sources = [
    payload?.normalized?.dados,
    payload?.dados,
    payload?.resultData,
    payload?.raw?.data,
    payload?.raw?.dados,
    payload?.raw?.bin,
    payload?.bin,
    payload?.raw,
    payload
  ].filter(s => s && typeof s === 'object');

  const rawPlaca = placaInput || findValue(['placa', 'placa_consultada', 'query_fornecida', 'termoBusca'], ...sources);
  const cleanPlaca = String(rawPlaca || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!cleanPlaca || cleanPlaca.length < 5) {
    return { success: false, totalInseridos: 0 };
  }

  // 1. Extração de Identificadores Chave
  const rawRenavam = findValue(['renavam', 'numero_renavam', 'cd_renavam', 'renavam_formatado'], ...sources);
  const cleanRenavam = rawRenavam ? String(rawRenavam).replace(/\D/g, '') : null;

  const rawChassi = findValue(['chassi', 'chassi_completo', 'numero_chassi'], ...sources);
  let cleanChassi = rawChassi ? String(rawChassi).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null;

  // 2. Extração de Dados Técnicos do Veículo (para Base BIN)
  const motor = findValue(['motor', 'numero_motor', 'nr_motor'], ...sources);
  const anoFabricacao = findValue(['ano_fabricacao', 'anoFabricacao', 'ano_fab', 'ano', 'anoFab'], ...sources);
  const anoModelo = findValue(['ano_modelo', 'anoModelo', 'ano_mod', 'anoMod'], ...sources);
  const ufPlaca = findValue(['uf', 'uf_placa', 'ufPlaca', 'UF'], ...sources);
  const municipio = findValue(['municipio', 'cidade', 'MUNICIPIO', 'nome_municipio'], ...sources);
  const cor = findValue(['cor', 'COR', 'cor_predominante'], ...sources);
  const combustivel = findValue(['combustivel', 'COMBUSTIVEL', 'tipo_combustivel'], ...sources);
  const faturado = findValue(['faturado_documento', 'faturado', 'cnpj_faturado', 'faturado_cnpj', 'doc_faturado'], ...sources);
  const ufFaturado = findValue(['uf_faturado', 'ufFaturado'], ...sources);
  const tipoDocFaturado = findValue(['tipo_doc_faturado', 'tipoDocFaturado'], ...sources);
  const tipoDocProp = findValue(['tipo_doc_prop', 'tipoDocProp'], ...sources);
  const situacaoVeiculo = findValue(['situacao_veiculo', 'situacaoVeiculo', 'situacao'], ...sources);
  const situacaoChassi = findValue(['situacao_chassi', 'situacaoChassi'], ...sources);
  const potencia = findValue(['potencia', 'potencia_cv'], ...sources);
  const cilindradas = findValue(['cilindradas', 'cilindrada'], ...sources);
  const cdMunicipio = findValue(['cd_municipio', 'cdMunicipio'], ...sources);
  const cdCorVeiculo = findValue(['cd_cor_veiculo', 'cdCorVeiculo', 'cdCor'], ...sources);
  const cdCombustivel = findValue(['cd_combustivel', 'cdCombustivel'], ...sources);
  const cdMarcaModelo = findValue(['cd_marca_modelo', 'cdMarcaModelo'], ...sources);

  // 3. Extração de Proprietários
  const rawHistorico: ProprietarioInput[] =
    findValue(['historico', 'historicoProprietarios', 'historico_proprietarios'], ...sources) || [];

  const rawPropAtual: ProprietarioInput | undefined =
    findValue(['proprietario_atual', 'proprietarioAtual'], ...sources);

  const listaItens: ProprietarioInput[] = [];
  const docsVistos = new Set<string>();

  if (Array.isArray(rawHistorico) && rawHistorico.length > 0) {
    for (const item of rawHistorico) {
      if (!item || typeof item !== 'object') continue;
      listaItens.push(item);
      const doc = String(item.documento || item.cpfcnpj || '').replace(/\D/g, '');
      if (doc) docsVistos.add(doc);
    }
  }

  if (rawPropAtual && typeof rawPropAtual === 'object') {
    const docAtual = String(rawPropAtual.documento || rawPropAtual.cpfcnpj || '').replace(/\D/g, '');
    if (docAtual && !docsVistos.has(docAtual)) {
      listaItens.push(rawPropAtual);
      docsVistos.add(docAtual);
    } else if (!docAtual && rawPropAtual.nome) {
      listaItens.push(rawPropAtual);
    }
  }

  // Suporte a campos planos de proprietário (típico de E12 BIN e consultas cadastrais)
  const propNomePlano = findValue(['proprietario_nome', 'nome_proprietario', 'proprietario', 'nomeProprietario'], ...sources);
  const propDocPlano = findValue(['proprietario_documento', 'documento_proprietario', 'cpf_cnpj_proprietario'], ...sources);
  const dataCrvPlano = findValue(['data_emissao_crv', 'data_aquisicao', 'dataEmissaoCrv', 'data'], ...sources);

  if (propDocPlano || propNomePlano) {
    const docLimpoPlano = propDocPlano ? String(propDocPlano).replace(/\D/g, '') : '';
    if (!docLimpoPlano || !docsVistos.has(docLimpoPlano)) {
      listaItens.push({
        nome: propNomePlano ? String(propNomePlano).trim().toUpperCase() : 'PROPRIETARIO REGISTRADO',
        documento: docLimpoPlano,
        cpfcnpj: docLimpoPlano,
        data: dataCrvPlano ? String(dataCrvPlano) : undefined,
        uf: ufPlaca ? String(ufPlaca).trim().toUpperCase() : undefined,
        municipio: municipio ? String(municipio).trim().toUpperCase() : undefined,
        atual: true
      });
      if (docLimpoPlano) docsVistos.add(docLimpoPlano);
    }
  }

  let client: any = null;
  let totalInseridos = 0;

  try {
    client = await infoPool.connect();

    // 4. Se o chassi não veio no payload, tentar enriquecer a partir da base existente
    if (!cleanChassi) {
      try {
        const chassiRes = await client.query(
          'SELECT chassi FROM veiculos_base_bin WHERE placa = $1 AND chassi IS NOT NULL LIMIT 1',
          [cleanPlaca]
        );
        if (chassiRes.rows.length > 0 && chassiRes.rows[0].chassi) {
          cleanChassi = chassiRes.rows[0].chassi.trim();
        } else {
          const chassiHistRes = await client.query(
            'SELECT chassi FROM historico_proprietarios WHERE placa = $1 AND chassi IS NOT NULL LIMIT 1',
            [cleanPlaca]
          );
          if (chassiHistRes.rows.length > 0 && chassiHistRes.rows[0].chassi) {
            cleanChassi = chassiHistRes.rows[0].chassi.trim();
          }
        }
      } catch (e: any) {
        appLogger.warn(`[SYNC INFOSINISTROS] Busca de chassi auxiliar falhou: ${e.message}`);
      }
    }

    // 5. Se veio RENAVAM, atualizar todos os registros pré-existentes daquela placa que estavam sem RENAVAM
    if (cleanRenavam) {
      try {
        const updateRenavamRes = await client.query(
          `UPDATE historico_proprietarios
           SET renavam = $1,
               chassi = COALESCE($2, chassi)
           WHERE (placa = $3 OR (chassi IS NOT NULL AND $2::text IS NOT NULL AND chassi = $2))
             AND (renavam IS NULL OR renavam = '');`,
          [cleanRenavam, cleanChassi, cleanPlaca]
        );
        if (updateRenavamRes.rowCount > 0) {
          appLogger.info(
            `[SYNC INFOSINISTROS] ${updateRenavamRes.rowCount} registro(s) prévio(s) de ${cleanPlaca} atualizado(s) com o RENAVAM ${cleanRenavam}`
          );
        }
      } catch (e: any) {
        appLogger.warn(`[SYNC INFOSINISTROS] Erro ao atualizar renavam em registros prévios: ${e.message}`);
      }
    }

    // 6. Gravação na tabela historico_proprietarios
    if (listaItens.length > 0) {
      for (const item of listaItens) {
        const rawDoc = String(item.documento || item.cpfcnpj || '').trim();
        const docLimpo = rawDoc.replace(/\D/g, '') || '00000000000';
        const tipoDoc = docLimpo.length === 11 ? 'CPF' : docLimpo.length === 14 ? 'CNPJ' : 'DOC';
        const nomeFinal = String(item.nome || item.razao_social || 'PROPRIETARIO REGISTRADO').trim().toUpperCase();
        const ufFinal = String(item.uf || ufPlaca || '').trim().toUpperCase() || null;
        const munFinal = String(item.municipio || item.cidade || municipio || '').trim().toUpperCase() || null;
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
          cleanChassi,
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
    } else if (cleanRenavam) {
      // Se não há itens na lista de proprietários, mas temos cleanRenavam (ex: E19 RENAVAM por Placa),
      // garantir a existência de pelo menos 1 registro âncora na tabela historico_proprietarios
      try {
        const checkHist = await client.query(
          'SELECT id FROM historico_proprietarios WHERE placa = $1 LIMIT 1',
          [cleanPlaca]
        );
        if (checkHist.rows.length === 0) {
          const uuid = crypto.randomUUID();
          const currentYear = new Date().getFullYear();
          await client.query(
            `INSERT INTO historico_proprietarios (
              id, placa, chassi, renavam, cpfcnpj, tipodocumento, nome, uf, municipio, anopropriedade, fonte, createdat
            ) VALUES (
              $1, $2, $3, $4, '00000000000', 'DOC', 'PROPRIETARIO REGISTRADO', $5, $6, $7, 'RENACRED', NOW()
            )
            ON CONFLICT (placa, cpfcnpj, anopropriedade)
            DO UPDATE SET
              renavam = COALESCE(EXCLUDED.renavam, historico_proprietarios.renavam),
              chassi = COALESCE(EXCLUDED.chassi, historico_proprietarios.chassi);`,
            [uuid, cleanPlaca, cleanChassi, cleanRenavam, ufPlaca ? String(ufPlaca).toUpperCase() : null, municipio ? String(municipio).toUpperCase() : null, currentYear]
          );
          totalInseridos++;
          appLogger.info(`[SYNC INFOSINISTROS] Registro âncora de RENAVAM criado para placa ${cleanPlaca}: ${cleanRenavam}`);
        }
      } catch (e: any) {
        appLogger.warn(`[SYNC INFOSINISTROS] Falha ao registrar âncora de renavam: ${e.message}`);
      }
    }

    // 7. Gravação / UPSERT na tabela veiculos_base_bin
    try {
      const vbbCheck = await client.query(
        `SELECT id, chassi, renavam FROM veiculos_base_bin 
         WHERE placa = $1 OR (chassi IS NOT NULL AND $2::text IS NOT NULL AND chassi = $2) 
         LIMIT 1`,
        [cleanPlaca, cleanChassi]
      );

      if (vbbCheck.rows.length > 0) {
        // Registro já existe: atualizar campos que vieram na consulta e sincronizar RENAVAM
        const existingId = vbbCheck.rows[0].id;
        await client.query(
          `UPDATE veiculos_base_bin SET
            chassi = COALESCE($1, chassi),
            motor = COALESCE($2, motor),
            "anoFabricacao" = COALESCE($3, "anoFabricacao"),
            "anoModelo" = COALESCE($4, "anoModelo"),
            "ufPlaca" = COALESCE($5, "ufPlaca"),
            faturado = COALESCE($6, faturado),
            "tipoDocFaturado" = COALESCE($7, "tipoDocFaturado"),
            "ufFaturado" = COALESCE($8, "ufFaturado"),
            "tipoDocProp" = COALESCE($9, "tipoDocProp"),
            "cdCombustivel" = COALESCE($10, "cdCombustivel"),
            "cdCorVeiculo" = COALESCE($11, "cdCorVeiculo"),
            "cdMunicipio" = COALESCE($12, "cdMunicipio"),
            "cdMarcaModelo" = COALESCE($13, "cdMarcaModelo"),
            "situacaoVeiculo" = COALESCE($14, "situacaoVeiculo"),
            "situacaoChassi" = COALESCE($15, "situacaoChassi"),
            potencia = COALESCE($16, potencia),
            cilindradas = COALESCE($17, cilindradas),
            renavam = COALESCE($18, renavam),
            "dataRenavam" = CASE WHEN $18::text IS NOT NULL THEN NOW() ELSE "dataRenavam" END,
            "dataAtualizacao" = NOW(),
            "ultimaAtualizacao" = NOW(),
            "updatedAt" = NOW()
          WHERE id = $19`,
          [
            cleanChassi,
            motor ? String(motor) : null,
            anoFabricacao ? String(anoFabricacao) : null,
            anoModelo ? String(anoModelo) : null,
            ufPlaca ? String(ufPlaca).toUpperCase() : null,
            faturado ? String(faturado) : null,
            tipoDocFaturado ? String(tipoDocFaturado) : null,
            ufFaturado ? String(ufFaturado) : null,
            tipoDocProp ? String(tipoDocProp) : null,
            cdCombustivel ? String(cdCombustivel) : null,
            cdCorVeiculo ? String(cdCorVeiculo) : null,
            cdMunicipio ? String(cdMunicipio) : null,
            cdMarcaModelo ? String(cdMarcaModelo) : null,
            situacaoVeiculo ? String(situacaoVeiculo) : null,
            situacaoChassi ? String(situacaoChassi) : null,
            potencia ? String(potencia) : null,
            cilindradas ? String(cilindradas) : null,
            cleanRenavam,
            existingId
          ]
        );
        appLogger.info(`[SYNC INFOSINISTROS] veiculos_base_bin atualizado para placa ${cleanPlaca} (RENAVAM: ${cleanRenavam || 'mantido'})`);
      } else if (cleanChassi || cleanRenavam || anoFabricacao) {
        // Veículo novo: inserir na base BIN local
        const uuidVbb = crypto.randomUUID();
        await client.query(
          `INSERT INTO veiculos_base_bin (
            id, placa, chassi, motor, "anoFabricacao", "anoModelo", "ufPlaca",
            faturado, "tipoDocFaturado", "ufFaturado", "tipoDocProp",
            "cdCombustivel", "cdCorVeiculo", "cdMunicipio", "cdMarcaModelo",
            "situacaoVeiculo", "situacaoChassi", potencia, cilindradas,
            renavam, "dataRenavam", "dataAtualizacao", "ultimaAtualizacao", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, CASE WHEN $20::text IS NOT NULL THEN NOW() ELSE NULL END, NOW(), NOW(), NOW(), NOW()
          )`,
          [
            uuidVbb,
            cleanPlaca,
            cleanChassi || `CHASSI_${cleanPlaca}`,
            motor ? String(motor) : null,
            anoFabricacao ? String(anoFabricacao) : null,
            anoModelo ? String(anoModelo) : null,
            ufPlaca ? String(ufPlaca).toUpperCase() : null,
            faturado ? String(faturado) : null,
            tipoDocFaturado ? String(tipoDocFaturado) : null,
            ufFaturado ? String(ufFaturado) : null,
            tipoDocProp ? String(tipoDocProp) : null,
            cdCombustivel ? String(cdCombustivel) : null,
            cdCorVeiculo ? String(cdCorVeiculo) : null,
            cdMunicipio ? String(cdMunicipio) : null,
            cdMarcaModelo ? String(cdMarcaModelo) : null,
            situacaoVeiculo ? String(situacaoVeiculo) : 'S',
            situacaoChassi ? String(situacaoChassi) : 'N',
            potencia ? String(potencia) : null,
            cilindradas ? String(cilindradas) : null,
            cleanRenavam
          ]
        );
        appLogger.info(`[SYNC INFOSINISTROS] Novo registro inserido em veiculos_base_bin para placa ${cleanPlaca} com RENAVAM ${cleanRenavam}`);
      }
    } catch (e: any) {
      appLogger.warn(`[SYNC INFOSINISTROS] Erro ao sincronizar veiculos_base_bin para placa ${cleanPlaca}: ${e.message}`);
    }

    appLogger.info(
      `[SYNC INFOSINISTROS] Sincronização concluída com sucesso para placa ${cleanPlaca} (Produto: ${productCode || 'VEICULAR'}). Itens: ${totalInseridos}`
    );
    return { success: true, totalInseridos };
  } catch (error: any) {
    appLogger.error(`[SYNC INFOSINISTROS] Falha geral ao sincronizar placa ${cleanPlaca} para InfoSinistros: ${error.message}`);
    return { success: false, totalInseridos };
  } finally {
    if (client) client.release();
  }
}
