import axios from 'axios';
import { logger } from '../utils/logger';
import { infoPool, syncVeicularToInfosinistros } from './syncToInfosinistrosService';
import { resolveCnpjRazaoSocial } from './cnpjService';
import { fipeGratisService } from './fipeGratisService';
import {
  buscarCodigoSusepPorCnpj,
  isCnaeSeguradoraNaoVida,
  isNomeSeguradora,
  formatarCnpj,
  mascararNomeSegurado,
  mascararDocumentoSegurado,
  parseDataFlexivel,
  formatarDataBR,
  calcularDataSinistro30DiasAntes
} from '../utils/susepHelper';

export interface ProprietarioCronologico {
  documento: string;
  nome: string | null;
  dataMovimentacao: Date | null;
  ano: number | null;
  uf: string | null;
  municipio: string | null;
  ordemOriginal: number;
}

export interface E24BdviiResult {
  placa: string;
  positivo: boolean;
  status: 'POSITIVO' | 'NEGATIVO';
  fonteHistorico: 'BASE_INTERNA_RENACRED' | 'API_HISTORICO_PROPRIETARIO';
  custoInternoTotal: number;
  mensagem: string;
  bloco01Entidade: {
    entidade: string;
    cnpj: string;
    codigoSusep: string;
  } | null;
  bloco02Sinistro: {
    ramo: string;
    tipoSeguro: string;
    status: string;
    dataSinistro: string;
    dataPosseSeguradora: string | null;
    cidadeUf: string;
  } | null;
  bloco03Segurado: {
    nomeCompleto: string;
    tipoDocumento: 'CPF' | 'CNPJ' | 'NÃO INFORMADO';
    documento: string;
  } | null;
  bloco04Veiculo: {
    placa: string;
    chassi: string;
    renavam: string;
    marca: string;
    modelo: string;
    anoFabricacao: string;
    anoModelo: string;
    cor: string;
    fipe: string;
    valor: string;
  };
  metadados: {
    totalProprietariosAnalisados: number;
    cnaeSeguradora?: string | null;
    consultadoEm: string;
  };
}

/**
 * Converte placa Mercosul <-> Antiga para busca abrangente na base interna (ex: AZZ2H58 <-> AZZ2758)
 */
function gerarVariacoesPlaca(placaLimpa: string): string[] {
  const variacoes = new Set<string>([placaLimpa]);
  if (placaLimpa.length !== 7) return Array.from(variacoes);

  const letraParaDigito: Record<string, string> = {
    A: '0', B: '1', C: '2', D: '3', E: '4',
    F: '5', G: '6', H: '7', I: '8', J: '9'
  };
  const digitoParaLetra: Record<string, string> = {
    '0': 'A', '1': 'B', '2': 'C', '3': 'D', '4': 'E',
    '5': 'F', '6': 'G', '7': 'H', '8': 'I', '9': 'J'
  };

  const quinto = placaLimpa[4];
  if (letraParaDigito[quinto]) {
    variacoes.add(placaLimpa.slice(0, 4) + letraParaDigito[quinto] + placaLimpa.slice(5));
  } else if (digitoParaLetra[quinto]) {
    variacoes.add(placaLimpa.slice(0, 4) + digitoParaLetra[quinto] + placaLimpa.slice(5));
  }

  return Array.from(variacoes);
}

/**
 * Busca registros na base interna historico_proprietarios (Custo R$ 0,00)
 */
async function consultarHistoricoBaseInterna(placaLimpa: string): Promise<{
  proprietarios: ProprietarioCronologico[];
  chassi: string | null;
  renavam: string | null;
} | null> {
  try {
    if (!infoPool || typeof infoPool.query !== 'function') return null;

    const variacoes = gerarVariacoesPlaca(placaLimpa);
    const placeholders = variacoes.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      SELECT id, placa, placaantiga, chassi, renavam, cpfcnpj, tipodocumento, nome,
             uf, municipio, anopropriedade, datainclusao, datalicenciamento, datamovimentacao, fonte, createdat
      FROM historico_proprietarios
      WHERE UPPER(REPLACE(placa, '-', '')) IN (${placeholders})
         OR UPPER(REPLACE(COALESCE(placaantiga, ''), '-', '')) IN (${placeholders})
      ORDER BY anopropriedade ASC NULLS LAST, datamovimentacao ASC NULLS LAST, createdat ASC
    `;

    const res = await infoPool.query(query, variacoes);
    if (!res.rows || res.rows.length === 0) return null;

    let chassi: string | null = null;
    let renavam: string | null = null;
    const proprietarios: ProprietarioCronologico[] = [];

    res.rows.forEach((row: any, idx: number) => {
      if (!chassi && row.chassi && String(row.chassi).trim().length >= 10) {
        chassi = String(row.chassi).trim().toUpperCase();
      }
      if (!renavam && row.renavam && String(row.renavam).replace(/\D/g, '').length >= 8) {
        renavam = String(row.renavam).trim();
      }

      const docDigits = String(row.cpfcnpj || '').replace(/\D/g, '');
      // Ignorar âncoras sintéticas sem documento real
      if (!docDigits || docDigits === '00000000000' || docDigits.length < 11) {
        return;
      }

      const dataMov =
        parseDataFlexivel(row.datamovimentacao) ||
        parseDataFlexivel(row.datainclusao) ||
        parseDataFlexivel(row.datalicenciamento);

      const ano = row.anopropriedade
        ? Number(row.anopropriedade)
        : (dataMov ? dataMov.getUTCFullYear() : null);

      const nomeRaw = row.nome ? String(row.nome).trim() : null;
      const nomeLimpo =
        nomeRaw &&
        nomeRaw.toUpperCase() !== 'PROPRIETARIO REGISTRADO' &&
        !nomeRaw.toUpperCase().includes('NAO INFORMAD')
          ? nomeRaw.toUpperCase()
          : null;

      proprietarios.push({
        documento: docDigits,
        nome: nomeLimpo,
        dataMovimentacao: dataMov,
        ano,
        uf: row.uf ? String(row.uf).trim().toUpperCase() : null,
        municipio: row.municipio ? String(row.municipio).trim().toUpperCase() : null,
        ordemOriginal: idx
      });
    });

    if (proprietarios.length === 0) return null;

    logger.info(`[E24 BDVII] Base interna encontrada para ${placaLimpa}: ${proprietarios.length} registros (Custo API: R$ 0,00)`);
    return { proprietarios, chassi, renavam };
  } catch (err: any) {
    logger.warn(`[E24 BDVII] Erro ao consultar base interna historico_proprietarios para ${placaLimpa}: ${err.message}`);
    return null;
  }
}

/**
 * Fallback externo: API FetchBrasil historico_proprietario (Custo R$ 0,17)
 */
async function consultarHistoricoApiExterna(placaLimpa: string): Promise<{
  proprietarios: ProprietarioCronologico[];
  chassi: string | null;
  renavam: string | null;
  rawData: any;
}> {
  const apiUrl = process.env.FETCHBRASIL_API_URL || 'https://api.fetchbrasil.pro';
  const token = process.env.FETCHBRASIL_API_TOKEN || 'FB-2414-FE5E-D56B-F396';

  logger.info(`[E24 BDVII] Sem registro interno para ${placaLimpa}. Consultando API externa historico_proprietario...`);

  const response = await axios.get(apiUrl, {
    params: {
      token,
      api: 'historico_proprietario',
      query: placaLimpa
    },
    timeout: 25000
  });

  const rawData = response.data;
  if (!rawData || rawData.success === false || rawData.error) {
    const errMsg = rawData?.message || rawData?.error || 'Falha ao consultar histórico de proprietários.';
    throw new Error(errMsg);
  }

  // Sincronizar imediatamente na base interna para que próximas consultas tenham custo R$ 0,00
  setImmediate(() => {
    syncVeicularToInfosinistros(placaLimpa, rawData, 'E24').catch((e) =>
      logger.warn(`[E24 BDVII] Erro na sincronização assíncrona de ${placaLimpa}: ${e.message}`)
    );
  });

  const histRaw = Array.isArray(rawData.historico) ? rawData.historico : [];
  const proprietarios: ProprietarioCronologico[] = [];

  histRaw.forEach((h: any, idx: number) => {
    const docDigits = String(h.documento || h.cpfcnpj || '').replace(/\D/g, '');
    if (!docDigits || docDigits.length < 11) return;

    const dataMov = parseDataFlexivel(h.data);
    const ano = dataMov ? dataMov.getUTCFullYear() : null;
    const nomeRaw = h.nome ? String(h.nome).trim().toUpperCase() : null;

    proprietarios.push({
      documento: docDigits,
      nome: nomeRaw || null,
      dataMovimentacao: dataMov,
      ano,
      uf: h.uf ? String(h.uf).trim().toUpperCase() : null,
      municipio: h.municipio ? String(h.municipio).trim().toUpperCase() : null,
      // Na FetchBrasil, ordem 1 é o mais recente e ordem N é o mais antigo
      ordemOriginal: histRaw.length - idx
    });
  });

  return {
    proprietarios,
    chassi: rawData.chassi ? String(rawData.chassi).trim().toUpperCase() : null,
    renavam: rawData.renavam ? String(rawData.renavam).trim() : null,
    rawData
  };
}

/**
 * Ordena cronologicamente (do mais antigo para o mais recente) e unifica posses consecutivas do mesmo documento.
 * Isso evita que múltiplos licenciamentos anuais da mesma seguradora (ex: 2017, 2018, 2019) quebrem a identificação do titular anterior.
 */
function construirLinhaDoTempoCronologica(lista: ProprietarioCronologico[]): ProprietarioCronologico[] {
  const ordenada = [...lista].sort((a, b) => {
    const timeA = a.dataMovimentacao
      ? a.dataMovimentacao.getTime()
      : (a.ano ? Date.UTC(a.ano, 6, 1) : 0);
    const timeB = b.dataMovimentacao
      ? b.dataMovimentacao.getTime()
      : (b.ano ? Date.UTC(b.ano, 6, 1) : 0);

    if (timeA !== timeB) return timeA - timeB;
    return a.ordemOriginal - b.ordemOriginal;
  });

  const consolidada: ProprietarioCronologico[] = [];
  for (const item of ordenada) {
    const ultimo = consolidada[consolidada.length - 1];
    if (ultimo && ultimo.documento === item.documento) {
      // Mescla na mesma posse: mantém a data mais antiga de entrada e preenche campos faltantes
      if (!ultimo.dataMovimentacao && item.dataMovimentacao) {
        ultimo.dataMovimentacao = item.dataMovimentacao;
      } else if (ultimo.dataMovimentacao && item.dataMovimentacao && item.dataMovimentacao < ultimo.dataMovimentacao) {
        ultimo.dataMovimentacao = item.dataMovimentacao;
      }
      if (!ultimo.ano && item.ano) ultimo.ano = item.ano;
      if (!ultimo.nome && item.nome) ultimo.nome = item.nome;
      if (!ultimo.municipio && item.municipio) ultimo.municipio = item.municipio;
      if (!ultimo.uf && item.uf) ultimo.uf = item.uf;
    } else {
      consolidada.push({ ...item });
    }
  }

  return consolidada;
}

/**
 * Busca nome/cidade de um CPF/CNPJ no banco local caso venha nulo na API externa
 */
async function resolverDadosTitularFallback(docDigits: string): Promise<{
  nome: string | null;
  municipio: string | null;
  uf: string | null;
}> {
  if (docDigits.length === 14) {
    const cnpjInfo = await resolveCnpjRazaoSocial(docDigits);
    if (cnpjInfo.razaoSocial) {
      return { nome: cnpjInfo.razaoSocial, municipio: null, uf: null };
    }
  }

  try {
    if (infoPool && typeof infoPool.query === 'function') {
      const res = await infoPool.query(
        `SELECT nome, municipio, uf FROM historico_proprietarios
         WHERE cpfcnpj = $1
           AND nome IS NOT NULL
           AND nome != ''
           AND nome != 'PROPRIETARIO REGISTRADO'
           AND nome NOT ILIKE '%NAO INFORMADO%'
         ORDER BY createdat DESC
         LIMIT 1`,
        [docDigits]
      );
      if (res.rows.length > 0) {
        return {
          nome: res.rows[0].nome ? String(res.rows[0].nome).trim().toUpperCase() : null,
          municipio: res.rows[0].municipio ? String(res.rows[0].municipio).trim().toUpperCase() : null,
          uf: res.rows[0].uf ? String(res.rows[0].uf).trim().toUpperCase() : null
        };
      }
    }
  } catch (err: any) {
    logger.warn(`[E24 BDVII] Fallback de nome para documento ${docDigits} falhou: ${err.message}`);
  }

  return { nome: null, municipio: null, uf: null };
}

/**
 * Busca dados completos do veículo (Bloco 04) combinando WDAPI + veiculos_base_bin + FIPE Gratuita
 */
async function consultarDadosVeiculoBloco04(
  placaLimpa: string,
  chassiHistorico: string | null,
  renavamHistorico: string | null
): Promise<E24BdviiResult['bloco04Veiculo']> {
  const wdapiUrl = process.env.WDAPI_URL || 'https://wdapi.com.br/placas';
  const wdapiToken = process.env.WDAPI_TOKEN || 'bede21d087b405a03f93106179672969';

  const [wdapiRes, binRes] = await Promise.allSettled([
    axios.get(`${wdapiUrl}/${placaLimpa}/${wdapiToken}`, { timeout: 8000 }).then((r) => r.data),
    (async () => {
      if (!infoPool || typeof infoPool.query !== 'function') return null;
      const variacoes = gerarVariacoesPlaca(placaLimpa);
      const placeholders = variacoes.map((_, i) => `$${i + 1}`).join(', ');
      const dbRes = await infoPool.query(
        `SELECT chassi, renavam, "anoFabricacao", "anoModelo", "ufPlaca", "cdCorVeiculo"
         FROM veiculos_base_bin
         WHERE UPPER(REPLACE(placa, '-', '')) IN (${placeholders})
            OR UPPER(REPLACE(COALESCE("placaModeloAntigo", ''), '-', '')) IN (${placeholders})
         ORDER BY "updatedAt" DESC NULLS LAST
         LIMIT 1`,
        variacoes
      );
      return dbRes.rows?.[0] || null;
    })()
  ]);

  const wd = wdapiRes.status === 'fulfilled' && wdapiRes.value ? wdapiRes.value : {};
  const extra = wd.extra || {};
  const bin = binRes.status === 'fulfilled' && binRes.value ? binRes.value : {};

  const chassiWd = extra.chassi && !String(extra.chassi).includes('*') ? String(extra.chassi).trim().toUpperCase() : null;
  const chassi = chassiHistorico || bin.chassi || chassiWd || (wd.chassi ? String(wd.chassi).trim().toUpperCase() : '-');
  const renavam = renavamHistorico || bin.renavam || (extra.renavam ? String(extra.renavam).trim() : null) || '-';
  const marca = String(wd.MARCA || wd.marca || '-').trim().toUpperCase();
  const modelo = String(wd.MODELO || wd.modelo || extra.modelo || '-').trim().toUpperCase();
  const anoFabricacao = String(extra.ano_fabricacao || wd.ano || bin.anoFabricacao || '-').trim();
  const anoModelo = String(extra.ano_modelo || wd.anoModelo || bin.anoModelo || '-').trim();
  const cor = String(wd.cor || '-').trim().toUpperCase();

  let codigoFipe = String(wd.fipe?.dados?.[0]?.codigo_fipe || '').trim();
  let valorFipe = String(wd.fipe?.dados?.[0]?.texto_valor || '').trim();

  // Se não veio valor FIPE na WDAPI, buscar na Tabela FIPE Oficial Gratuita
  if (!valorFipe && marca !== '-' && modelo !== '-') {
    try {
      const fipeResult = await fipeGratisService.consultarFipe({
        marca,
        modelo,
        marcaModelo: wd.marcaModelo || `${marca}/${modelo}`,
        anoModelo,
        anoFabricacao,
        tipoVeiculo: extra.tipo_veiculo
      });
      if (fipeResult && fipeResult.sucesso) {
        if (!codigoFipe && fipeResult.codigoFipe && fipeResult.codigoFipe !== '-') {
          codigoFipe = fipeResult.codigoFipe;
        }
        if (fipeResult.valor) {
          valorFipe = fipeResult.valor;
        }
      }
    } catch (err: any) {
      logger.warn(`[E24 BDVII] Falha ao enriquecer valor FIPE para ${placaLimpa}: ${err.message}`);
    }
  }

  return {
    placa: placaLimpa,
    chassi: chassi || '-',
    renavam: renavam || '-',
    marca: marca || '-',
    modelo: modelo || '-',
    anoFabricacao: anoFabricacao || '-',
    anoModelo: anoModelo || '-',
    cor: cor || '-',
    fipe: codigoFipe || 'NÃO INFORMADO',
    valor: valorFipe || 'NÃO INFORMADO'
  };
}

class E24Service {
  /**
   * Executa a análise completa do produto E24 - BDVII (Base de Dados de Veículos Indenizados Integralmente)
   */
  public async executarConsultaE24(placaInput: string): Promise<E24BdviiResult> {
    const placaLimpa = String(placaInput || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!placaLimpa || placaLimpa.length < 7) {
      throw new Error('Placa inválida. Informe uma placa no formato AAA0000 ou AAA0A00.');
    }

    // 1. REGRA DE OURO: Somente consultar API externa se não houver registro interno
    let fonteHistorico: 'BASE_INTERNA_RENACRED' | 'API_HISTORICO_PROPRIETARIO' = 'BASE_INTERNA_RENACRED';
    let custoInternoTotal = 0;
    let chassiHistorico: string | null = null;
    let renavamHistorico: string | null = null;
    let proprietariosBrutos: ProprietarioCronologico[] = [];

    const interno = await consultarHistoricoBaseInterna(placaLimpa);
    if (interno && interno.proprietarios.length > 0) {
      proprietariosBrutos = interno.proprietarios;
      chassiHistorico = interno.chassi;
      renavamHistorico = interno.renavam;
      fonteHistorico = 'BASE_INTERNA_RENACRED';
      custoInternoTotal = 0;
    } else {
      const externo = await consultarHistoricoApiExterna(placaLimpa);
      proprietariosBrutos = externo.proprietarios;
      chassiHistorico = externo.chassi;
      renavamHistorico = externo.renavam;
      fonteHistorico = 'API_HISTORICO_PROPRIETARIO';
      custoInternoTotal = 0.17;
    }

    // 2. Ordenar cronologicamente e consolidar posses consecutivas
    const timeline = construirLinhaDoTempoCronologica(proprietariosBrutos);

    // 3. Disparar consulta de dados do veículo (Bloco 04) em paralelo com varredura de CNPJs
    const veiculoPromise = consultarDadosVeiculoBloco04(placaLimpa, chassiHistorico, renavamHistorico);

    // 4. Varredura cronológica buscando Pessoa Jurídica Seguradora Não-Vida
    let seguradoraIdx = -1;
    let seguradoraRazaoSocial: string | null = null;
    let seguradoraCodigoSusep: string | null = null;
    let seguradoraCnae: string | null = null;

    for (let i = 0; i < timeline.length; i++) {
      const prop = timeline[i];
      if (prop.documento.length !== 14) continue; // Somente Pessoa Jurídica

      const codigoSusep = buscarCodigoSusepPorCnpj(prop.documento);
      const cnpjInfo = await resolveCnpjRazaoSocial(prop.documento);
      const razaoResolvida = cnpjInfo.razaoSocial || prop.nome;

      const isCnaeSeg = isCnaeSeguradoraNaoVida(cnpjInfo.cnae, cnpjInfo.cnaeDescricao);
      const isSusepSeg = codigoSusep !== null;
      const isNomeSeg = isNomeSeguradora(razaoResolvida);

      if (isCnaeSeg || isSusepSeg || isNomeSeg) {
        seguradoraIdx = i;
        seguradoraRazaoSocial = razaoResolvida || prop.nome || 'SEGURADORA IDENTIFICADA';
        seguradoraCodigoSusep = codigoSusep;
        seguradoraCnae = cnpjInfo.cnae || null;
        logger.info(
          `[E24 BDVII] POSITIVO para ${placaLimpa}: Seguradora=${seguradoraRazaoSocial}, CNPJ=${prop.documento}, SUSEP=${codigoSusep || 'N/A'}, CNAE=${cnpjInfo.cnae || 'N/A'}`
        );
        break;
      }
    }

    const bloco04Veiculo = await veiculoPromise;

    // 5. Caso NEGATIVO (Nenhuma seguradora localizada no histórico)
    if (seguradoraIdx === -1) {
      return {
        placa: placaLimpa,
        positivo: false,
        status: 'NEGATIVO',
        fonteHistorico,
        custoInternoTotal,
        mensagem: 'Nenhum registro de sinistro com indenização integral (BDVII) localizado no histórico dominial do veículo.',
        bloco01Entidade: null,
        bloco02Sinistro: null,
        bloco03Segurado: null,
        bloco04Veiculo,
        metadados: {
          totalProprietariosAnalisados: timeline.length,
          consultadoEm: new Date().toISOString()
        }
      };
    }

    // 6. Caso POSITIVO: Montar Blocos 01, 02 e 03
    const seguradoraProp = timeline[seguradoraIdx];
    const seguradoProp = seguradoraIdx > 0 ? timeline[seguradoraIdx - 1] : null;

    // Resolver nome/cidade do segurado caso venha vazio na API externa
    let seguradoNomeRaw = seguradoProp?.nome || null;
    let seguradoMunicipio = seguradoProp?.municipio || null;
    let seguradoUf = seguradoProp?.uf || null;

    if (seguradoProp && (!seguradoNomeRaw || !seguradoMunicipio)) {
      const fb = await resolverDadosTitularFallback(seguradoProp.documento);
      if (!seguradoNomeRaw && fb.nome) seguradoNomeRaw = fb.nome;
      if (!seguradoMunicipio && fb.municipio) seguradoMunicipio = fb.municipio;
      if (!seguradoUf && fb.uf) seguradoUf = fb.uf;
    }

    // Data da posse da seguradora e cálculo da Data do Sinistro (30 dias antes)
    const dataPosseBase =
      seguradoraProp.dataMovimentacao ||
      (seguradoraProp.ano ? new Date(Date.UTC(seguradoraProp.ano, 0, 1, 12, 0, 0)) : null);

    const dataPosseFormatada = formatarDataBR(dataPosseBase);
    const dataSinistroCalculada = calcularDataSinistro30DiasAntes(dataPosseBase) || 'NÃO INFORMADA';

    // Cidade/UF do proprietário imediatamente anterior à seguradora
    const cidadeUfFinal =
      seguradoMunicipio && seguradoUf
        ? `${seguradoMunicipio} / ${seguradoUf}`
        : seguradoMunicipio || seguradoUf || (seguradoraProp.municipio && seguradoraProp.uf ? `${seguradoraProp.municipio} / ${seguradoraProp.uf}` : 'NÃO INFORMADA');

    // Máscaras LGPD do Segurado (Bloco 03)
    const nomeMascarado = mascararNomeSegurado(seguradoNomeRaw);
    const { tipoDocumento, documentoMascarado } = mascararDocumentoSegurado(seguradoProp?.documento);

    return {
      placa: placaLimpa,
      positivo: true,
      status: 'POSITIVO',
      fonteHistorico,
      custoInternoTotal,
      mensagem: 'Consta registro de Sinistro com Indenização Integral (BDVII) vinculado à transferência dominial para Seguradora Não-Vida.',
      bloco01Entidade: {
        entidade: seguradoraRazaoSocial || 'SEGURADORA IDENTIFICADA',
        cnpj: formatarCnpj(seguradoraProp.documento),
        codigoSusep: seguradoraCodigoSusep || 'NÃO LOCALIZADO'
      },
      bloco02Sinistro: {
        ramo: 'Automóvel',
        tipoSeguro: 'Compreensivo',
        status: 'Sinistro Indenizado Integralmente',
        dataSinistro: dataSinistroCalculada,
        dataPosseSeguradora: dataPosseFormatada,
        cidadeUf: cidadeUfFinal
      },
      bloco03Segurado: {
        nomeCompleto: nomeMascarado,
        tipoDocumento,
        documento: documentoMascarado
      },
      bloco04Veiculo,
      metadados: {
        totalProprietariosAnalisados: timeline.length,
        cnaeSeguradora: seguradoraCnae,
        consultadoEm: new Date().toISOString()
      }
    };
  }
}

export const e24Service = new E24Service();
