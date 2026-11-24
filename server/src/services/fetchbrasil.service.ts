import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { findServerProduct, ServerProductConfig } from '../config/productsCatalog';
import { normalizeProductResult, NormalizedResult } from './productNormalizers';
import { enrichProprietariosWithCnpj } from './cnpjService';
import { prisma } from '../config/database';
import { QueryStatus } from '../types/database';
import { infoPool } from './syncToInfosinistrosService';
import { infosinistrosService } from './infosinistrosService';


export interface ParteDeclaracao {
  nome: string;
  cpfCnpj: string;
}

export interface DeclaracaoImobiliaria {
  numDeclaracao?: string;
  nome?: string;
  tipoParte?: string;
  tipoDeclaracao?: string;
  matricula?: string;
  registro?: string;
  livro?: string;
  folha?: string;
  dataLavratura?: string;
  infoData?: string;
  cnpjCartorio?: string;
  cartorio?: string;
  tipoCartorio?: string;
  alienantes?: ParteDeclaracao[];
  adquirentes?: ParteDeclaracao[];
}

export interface FetchBrasilImobiliarioResponse {
  periodo?: string;
  total_declaracoes: number;
  declaracoes: DeclaracaoImobiliaria[];
  api_central?: {
    api_utilizada?: string;
    parametro_utilizado?: string;
    query_fornecida?: string;
    timestamp?: string;
    tempo_resposta_ms?: number;
    origem?: string;
    data_captura_original?: string;
    cache_interno?: boolean;
    [key: string]: any;
  };
  erro?: string;
  mensagem?: string;
}

export interface ProprietarioAtual {
  nome: string;
  documento: string;
  tipo: string;
  evento: string | null;
  uf: string;
  municipio: string;
}

export interface HistoricoProprietarioItem {
  ordem: number;
  documento: string;
  tipo: string;
  nome: string;
  data: string; // DD/MM/AAAA
  hora: string; // HH:mm:ss
  uf: string;
  municipio: string;
  evento: string | null;
  atual: boolean;
}

export interface FetchBrasilProprietarioResponse {
  success: boolean;
  placa: string;
  renavam: string;
  consulta_em: string;
  total: number;
  proprietario_atual?: ProprietarioAtual;
  historico: HistoricoProprietarioItem[];
  message?: string | null;
  api_central?: {
    api_utilizada?: string;
    parametro_utilizado?: string;
    query_fornecida?: string;
    timestamp?: string;
    tempo_resposta_ms?: number;
    origem?: string;
    data_captura_original?: string;
    cache_interno?: boolean;
    [key: string]: any;
  };
}

interface CacheEntry {
  data: FetchBrasilImobiliarioResponse;
  timestamp: number;
}

interface VeicularCacheEntry {
  data: FetchBrasilProprietarioResponse;
  timestamp: number;
}

/**
 * Extrai de forma resiliente a mensagem textual de retorno da FetchBrasil (seja message, mensagem, error ou erro)
 */
export function extractFetchBrasilMessage(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return null;
  return data.mensagem || data.message || data.error || data.erro || null;
}

/**
 * Identifica se uma resposta ou erro da FetchBrasil representa "Registro não encontrado" legítimo.
 * NUNCA trata erros de scraping, resolução ("resolve_failed"), instabilidade ou API fora do ar como "não encontrado".
 */
export function isFetchBrasilNotFound(data: any, status?: number): boolean {
  if (!data || typeof data !== 'object' || Buffer.isBuffer(data)) return false;

  // 1. Falha explícita de resolução no DETRAN/órgão ou API fora do ar NUNCA é "Registro não encontrado"
  if (
    data.error === 'resolve_failed' ||
    data.erro === 'resolve_failed' ||
    data.status === 'resolve_failed' ||
    data.code === 'resolve_failed'
  ) {
    return false;
  }

  const msg = extractFetchBrasilMessage(data);
  if (typeof msg === 'string') {
    // Frases técnicas de robô/scraper que NÃO representam "nada consta" oficial
    if (/obter renavam\/chassi|resolve_failed|falha ao consultar|erro ao comunicar|instabilidade|fora do ar|manuten|timeout|service unavailable|indispon[íi]vel|tente novamente/i.test(msg)) {
      return false;
    }
  }

  // 2. Se a mensagem ou erro for explicitamente "Registro não encontrado", "Nada Consta" ou "Veículo não encontrado"
  const errStr = String(data.error || data.erro || '').trim().toLowerCase();
  if (
    errStr === 'registro não encontrado' ||
    errStr === 'registro nao encontrado' ||
    errStr === 'veículo não encontrado' ||
    errStr === 'veiculo nao encontrado' ||
    errStr === 'nada consta'
  ) {
    return true;
  }

  if (typeof msg === 'string') {
    const cleanMsg = msg.trim().toLowerCase();
    if (
      cleanMsg === 'registro não encontrado' ||
      cleanMsg === 'registro nao encontrado' ||
      cleanMsg === 'nada consta' ||
      cleanMsg === 'veículo não encontrado' ||
      cleanMsg === 'veiculo nao encontrado' ||
      cleanMsg === 'nenhum registro encontrado' ||
      cleanMsg === 'documento não localizado' ||
      cleanMsg === 'documento nao localizado' ||
      cleanMsg.includes('veículo não encontrado') ||
      cleanMsg.includes('veiculo nao encontrado') ||
      cleanMsg.includes('não encontrado no serpro') ||
      cleanMsg.includes('nao encontrado no serpro') ||
      cleanMsg.includes('veículo inexistente') ||
      cleanMsg.includes('veiculo inexistente')
    ) {
      return true;
    }
  }

  return false;
}

export class FetchBrasilService {
  private apiURL: string;
  private token: string;
  private client: AxiosInstance;
  
  // Cache de curto prazo em memória (10 minutos)
  private cache = new Map<string, CacheEntry>();
  private veicularCache = new Map<string, VeicularCacheEntry>();
  private genericCache = new Map<string, { data: NormalizedResult; timestamp: number; providerUsed: string }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  // Deduplicação de requisições simultâneas em voo (Singleflight)
  private inFlight = new Map<string, Promise<FetchBrasilImobiliarioResponse>>();
  private veicularInFlight = new Map<string, Promise<FetchBrasilProprietarioResponse>>();
  private genericInFlight = new Map<string, Promise<{ normalized: NormalizedResult; raw: any; providerUsed: string; processingTimeMs: number }>>();

  constructor() {
    this.apiURL = process.env.FETCHBRASIL_API_URL || 'https://api.fetchbrasil.pro';
    const configuredToken = process.env.FETCHBRASIL_API_TOKEN || 'FB-2414-FE5E-D56B-F396';
    // Mapeamento defensivo: converte token legado antigo para o novo token ativo da FetchBrasil
    this.token = (configuredToken === 'FB-78C1-9751-7F03-D237') ? 'FB-2414-FE5E-D56B-F396' : configuredToken;

    let proxyConfig: any = false;
    const proxyUrl = process.env.FETCHBRASIL_PROXY_URL;
    if (proxyUrl) {
      try {
        const u = new URL(proxyUrl);
        proxyConfig = {
          protocol: u.protocol.replace(':', ''),
          host: u.hostname,
          port: parseInt(u.port, 10),
          auth: u.username ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : undefined,
        };
        logger.info(`[FETCHBRASIL] Proxy configurado: ${proxyConfig.host}:${proxyConfig.port}`);
      } catch (e: any) {
        logger.error(`[FETCHBRASIL] Erro ao parsear FETCHBRASIL_PROXY_URL: ${e.message}`);
      }
    }

    this.client = axios.create({
      baseURL: this.apiURL,
      timeout: 90000,
      httpsAgent: new https.Agent({
        keepAlive: false, // Desativado para evitar sockets ociosos mantidos pelo Node que o Cloudflare fecha silenciosamente
        family: 4 // Força IPv4 indispensável para liberação no WAF da FetchBrasil
      }),
      proxy: proxyConfig,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  }

  /**
   * Limpeza de entradas expiradas do cache em memória
   */
  private cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
    for (const [key, entry] of this.veicularCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.veicularCache.delete(key);
      }
    }
    for (const [key, entry] of this.genericCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.genericCache.delete(key);
      }
    }
  }

  /**
   * Consulta Histórico Imobiliário por CPF ou CNPJ com alta performance
   */
  async consultarHistoricoImobiliario(query: string): Promise<FetchBrasilImobiliarioResponse> {
    const cleanDoc = query.replace(/\D/g, '');

    // 1. Verificar Cache de Curto Prazo (HIT instantâneo em 0ms)
    const cached = this.cache.get(cleanDoc);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      logger.info(`[FETCHBRASIL] Cache HIT instantâneo para documento: ${cleanDoc} (0ms)`);
      return cached.data;
    }

    // 2. Verificar se já existe uma requisição em voo para o mesmo documento (Deduplicação / Singleflight)
    if (this.inFlight.has(cleanDoc)) {
      logger.info(`[FETCHBRASIL] Deduplicando chamada em voo para documento: ${cleanDoc}`);
      return await this.inFlight.get(cleanDoc)!;
    }

    // 3. Executar chamada com resiliência e registrar na lista de voo
    const fetchPromise = (async () => {
      const startTime = Date.now();
      const maxAttempts = 2;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            logger.info(`[FETCHBRASIL] Tentativa de retry ${attempt}/${maxAttempts} para documento: ${cleanDoc}...`);
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            logger.info(`[FETCHBRASIL] Consultando histórico imobiliário para documento: ${cleanDoc}`);
          }

          const response = await this.client.get('/', {
            params: {
              token: this.token,
              api: 'historico_imobiliario',
              query: cleanDoc,
            },
          });

          const processingTime = Date.now() - startTime;
          logger.info(`[FETCHBRASIL] Sucesso na consulta (${processingTime}ms) para ${cleanDoc}`);

          const data = response.data;
          let result: FetchBrasilImobiliarioResponse;

          if (isFetchBrasilNotFound(data, response.status)) {
            result = {
              periodo: data?.periodo || '',
              total_declaracoes: 0,
              declaracoes: [],
              mensagem: extractFetchBrasilMessage(data) || 'Nenhum histórico imobiliário encontrado para o documento informado.',
              api_central: data?.api_central || {
                api_utilizada: 'historico_imobiliario',
                parametro_utilizado: 'query',
                query_fornecida: cleanDoc,
                timestamp: new Date().toISOString(),
              }
            };
            return result;
          } else if (data && data.success !== false && !data.error && Array.isArray(data.declaracoes)) {
            result = {
              periodo: data.periodo || '',
              total_declaracoes: data.total_declaracoes !== undefined ? data.total_declaracoes : data.declaracoes.length,
              declaracoes: data.declaracoes,
              api_central: data.api_central || {
                api_utilizada: 'historico_imobiliario',
                parametro_utilizado: 'query',
                query_fornecida: cleanDoc,
                timestamp: new Date().toISOString(),
              }
            };
            // Armazena no cache se teve sucesso com registros reais
            if (result.total_declaracoes > 0) {
              this.cache.set(cleanDoc, { data: result, timestamp: Date.now() });
              this.cleanExpiredCache();
            }
            return result;
          } else {
            // Se a API retornou erro ou success: false, é falha técnica de upstream
            const errMsg = extractFetchBrasilMessage(data) || 'Estamos em manutenção, tente mais tarde';
            throw new Error(errMsg);
          }
        } catch (error: any) {
          const status = error.response?.status;
          const respData = error.response?.data;

          if (isFetchBrasilNotFound(respData, status)) {
            const attemptTime = Date.now() - startTime;
            logger.info(`[FETCHBRASIL] Registro não encontrado (404/Not Found) para documento ${cleanDoc} em ${attemptTime}ms: ${extractFetchBrasilMessage(respData)}`);
            const notFoundResult: FetchBrasilImobiliarioResponse = {
              periodo: respData?.periodo || '',
              total_declaracoes: 0,
              declaracoes: [],
              mensagem: extractFetchBrasilMessage(respData) || 'Nenhum histórico imobiliário encontrado para o documento informado.',
              api_central: respData?.api_central || {
                api_utilizada: 'historico_imobiliario',
                parametro_utilizado: 'query',
                query_fornecida: cleanDoc,
                timestamp: new Date().toISOString(),
              }
            };
            return notFoundResult;
          }

          lastError = error;
          const attemptTime = Date.now() - startTime;
          const errorMsg = extractFetchBrasilMessage(respData) || error.message;
          logger.warn(`[FETCHBRASIL] Falha na tentativa ${attempt}/${maxAttempts} após ${attemptTime}ms para ${cleanDoc}: ${errorMsg}`);

          // Não tentar novamente se for erro de autorização/cliente (400, 401, 403, 404)
          if (status && [400, 401, 403, 404].includes(status)) {
            break;
          }
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalMsg = extractFetchBrasilMessage(lastError?.response?.data) || lastError?.message || 'Estamos em manutenção, tente mais tarde';
      logger.error(`[FETCHBRASIL] Erro na consulta após ${totalProcessingTime}ms para ${cleanDoc}: ${finalMsg}`);
      throw new Error('Estamos em manutenção, tente mais tarde');
    })();

    this.inFlight.set(cleanDoc, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.inFlight.delete(cleanDoc);
    }
  }

  /**
   * Helper para converter data DD/MM/AAAA e hora HH:mm:ss em timestamp milissegundos
   */
  private parseDataHora(dataStr?: string, horaStr?: string): number {
    if (!dataStr) return 0;
    try {
      const parts = dataStr.trim().split('/');
      if (parts.length !== 3) return 0;
      const dia = parseInt(parts[0], 10);
      const mes = parseInt(parts[1], 10) - 1;
      const ano = parseInt(parts[2], 10);

      let horas = 0;
      let minutos = 0;
      let segundos = 0;

      if (horaStr) {
        const timeParts = horaStr.trim().split(':');
        horas = parseInt(timeParts[0], 10) || 0;
        minutos = parseInt(timeParts[1], 10) || 0;
        segundos = parseInt(timeParts[2], 10) || 0;
      }

      return new Date(ano, mes, dia, horas, minutos, segundos).getTime();
    } catch {
      return 0;
    }
  }

  /**
   * Busca no banco de dados interno da Renacred se a placa já foi consultada
   * para o produto E2 (Histórico de Proprietários) com sucesso dentro da janela de validade (padrão: 60 dias).
   * Se encontrada, retorna os dados da base interna com custo ZERO de fornecedor.
   */
  async buscarE2BaseInterna(
    cleanPlaca: string,
    maxAgeDays?: number
  ): Promise<FetchBrasilProprietarioResponse | null> {
    try {
      const days = typeof maxAgeDays === 'number' && maxAgeDays > 0
        ? maxAgeDays
        : parseInt(process.env.E2_CACHE_TTL_DAYS || '60', 10);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const record = await prisma.query.findFirst({
        where: {
          identifier: cleanPlaca,
          status: QueryStatus.COMPLETED,
          totalDeclaracoes: { gt: 0 },
          createdAt: { gte: cutoffDate },
          OR: [
            { requestData: { path: ['product'], equals: 'E2' } },
            { requestData: { path: ['product'], equals: 'historico_proprietario' } },
            { requestData: { path: ['product'], equals: 'proprietarios' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!record || !record.resultData) {
        return null;
      }

      const raw = record.resultData as any;
      const historico = Array.isArray(raw.historico) ? raw.historico : [];
      if (historico.length === 0 && !raw.proprietario_atual) {
        return null;
      }

      logger.info(
        `[BASE INTERNA E2] Placa ${cleanPlaca} localizada na base interna (Consulta original: ${record.createdAt.toISOString()}). Fornecedor externo poupado (Custo: R$ 0,00).`
      );

      return {
        success: true,
        placa: raw.placa || cleanPlaca,
        renavam: raw.renavam || '',
        consulta_em: record.createdAt.toISOString(),
        total: historico.length || record.totalDeclaracoes,
        proprietario_atual: raw.proprietario_atual || undefined,
        historico,
        message: raw.message || null,
        api_central: {
          api_utilizada: 'historico_proprietario',
          parametro_utilizado: 'placa',
          query_fornecida: cleanPlaca,
          timestamp: new Date().toISOString(),
          tempo_resposta_ms: 5,
          origem: 'BASE_INTERNA_RENACRED',
          data_captura_original: record.createdAt.toISOString(),
          cache_interno: true
        }
      };
    } catch (err: any) {
      logger.error(`[BASE INTERNA E2] Erro ao consultar base interna para ${cleanPlaca}: ${err.message}`);
      return null;
    }
  }

  /**
   * Identifica se a resposta da API placa_df indica "Resposta vazia" / DETRAN-DF sem conteúdo
   */
  isPlacaDfRespostaVazia(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const err = String(data.error || data.erro || '').toLowerCase();
    const msg = String(data.message || data.mensagem || '').toLowerCase();
    return (
      data.success === false &&
      (err.includes('resposta vazia') ||
       msg.includes('resposta vazia') ||
       msg.includes('não retornou conteúdo') ||
       msg.includes('nao retornou conteudo') ||
       msg.includes('detran-df') ||
       err.includes('registro não encontrado') ||
       err.includes('registro nao encontrado') ||
       msg.includes('registro não encontrado') ||
       msg.includes('registro nao encontrado'))
    );
  }

  /**
   * Identifica se a resposta da API placa_serpro indica veículo não encontrado
   */
  isSerproVeiculoNaoEncontrado(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    const err = String(data.error || data.erro || '').trim().toLowerCase();
    const msg = String(data.message || data.mensagem || '').trim().toLowerCase();
    return (
      err.includes('veículo não encontrado') ||
      err.includes('veiculo nao encontrado') ||
      msg.includes('veículo não encontrado') ||
      msg.includes('veiculo nao encontrado') ||
      msg.includes('não encontrado no serpro') ||
      msg.includes('nao encontrado no serpro') ||
      msg.includes('veículo inexistente') ||
      msg.includes('veiculo inexistente')
    );
  }

  /**
   * Consulta a Base BIN interna (veiculos_base_bin no PostgreSQL, histórico Renacred e P35 InfoSinistros)
   * para localizar dados cadastrais e RENAVAM do veículo caso o DETRAN-DF retorne resposta vazia no E19.
   */
  async buscarBinInterna(cleanPlaca: string): Promise<{
    renavam: string;
    name?: string;
    type?: string;
    year?: string;
    yearManufacture?: string;
    plate?: string;
    chassi?: string;
    source: string;
    raw?: any;
  } | null> {
    const placaClean = cleanPlaca.replace(/[^A-Z0-9]/gi, '').toUpperCase().trim();

    // 1. Tentar na tabela oficial veiculos_base_bin da InfoSinistros (Pool PostgreSQL compartilhado na VPS)
    try {
      const res = await infoPool.query(
        'SELECT * FROM veiculos_base_bin WHERE placa = $1 LIMIT 1',
        [placaClean]
      );
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        const renavamRaw = row.renavam || row.codigo_renavam || row.codigoRenavam;
        if (renavamRaw && String(renavamRaw).trim() !== '' && String(renavamRaw).toUpperCase() !== 'NADA CONSTA') {
          const renavam = String(renavamRaw).trim();
          logger.info(`[BASE BIN INTERNA] Placa ${placaClean} localizada na tabela veiculos_base_bin (RENAVAM: ${renavam})`);
          return {
            renavam,
            name: row.marca_modelo || row.modelo || row.descricao_marca_modelo || row.marca || 'NÃO INFORMADO',
            type: row.tipo_veiculo || row.tipo || row.especie || 'AUTOMOVEL',
            year: row.ano_modelo ? String(row.ano_modelo) : (row.ano ? String(row.ano) : undefined),
            yearManufacture: row.ano_fabricacao ? String(row.ano_fabricacao) : undefined,
            plate: row.placa || placaClean,
            chassi: row.chassi || undefined,
            source: 'veiculos_base_bin',
            raw: row
          };
        }
      }
    } catch (err: any) {
      logger.warn(`[BASE BIN INTERNA] Tabela veiculos_base_bin indisponível ou erro para ${placaClean}: ${err.message}`);
    }

    // 2. Tentar no histórico de consultas concluídas do banco de dados Renacred (prisma.query)
    try {
      const record = await prisma.query.findFirst({
        where: {
          identifier: placaClean,
          status: QueryStatus.COMPLETED,
          totalDeclaracoes: { gt: 0 },
          OR: [
            { requestData: { path: ['product'], equals: 'E12' } },
            { requestData: { path: ['product'], equals: 'E19' } },
            { requestData: { path: ['product'], equals: 'E20' } },
            { requestData: { path: ['product'], equals: 'bin' } },
            { requestData: { path: ['product'], equals: 'busca-renavam' } },
            { requestData: { path: ['product'], equals: 'pre-vistoria' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (record && record.resultData) {
        const rawRes: any = record.resultData;
        const renavamRaw = rawRes.renavam || rawRes.dados?.renavam || rawRes.veiculo?.renavam || rawRes.vehicle?.renavam || rawRes.veiculo?.codigoRenavam;
        if (renavamRaw && String(renavamRaw).trim() !== '' && String(renavamRaw).toUpperCase() !== 'NADA CONSTA') {
          const renavam = String(renavamRaw).trim();
          logger.info(`[BASE BIN INTERNA] Placa ${placaClean} localizada no histórico interno Renacred (Query ${record.id}, RENAVAM: ${renavam})`);
          return {
            renavam,
            name: rawRes.name || rawRes.dados?.name || rawRes.veiculo?.modelo || rawRes.vehicle?.model?.name || 'NÃO INFORMADO',
            type: rawRes.type || rawRes.dados?.type || rawRes.veiculo?.tipo || rawRes.vehicle?.type || 'AUTOMOVEL',
            year: rawRes.year || rawRes.dados?.year || rawRes.veiculo?.anoModelo || rawRes.vehicle?.model?.year,
            yearManufacture: rawRes.yearManufacture || rawRes.dados?.yearManufacture || rawRes.veiculo?.anoFabricacao || rawRes.vehicle?.yearManufacture,
            plate: rawRes.plate || rawRes.dados?.plate || placaClean,
            chassi: rawRes.chassi || rawRes.veiculo?.chassi,
            source: 'base_interna_renacred',
            raw: rawRes
          };
        }
      }
    } catch (err: any) {
      logger.warn(`[BASE BIN INTERNA] Histórico interno Renacred indisponível para ${placaClean}: ${err.message}`);
    }

    // 3. Tentar via BIN Fabril P35 da InfoSinistros (Admin API Key B2B ilimitada)
    try {
      const infoSin = await infosinistrosService.consultarPreVistoria(placaClean);
      const p35 = infoSin?.resultados?.P35?.conteudo;
      const renavamP35 = p35?.renavam || p35?.codigoRenavam;
      if (renavamP35 && String(renavamP35).trim() !== '' && String(renavamP35).toUpperCase() !== 'NADA CONSTA') {
        const renavam = String(renavamP35).trim();
        logger.info(`[BASE BIN INTERNA] Placa ${placaClean} localizada na BIN Fabril P35 da InfoSinistros (RENAVAM: ${renavam})`);
        return {
          renavam,
          name: p35.marcaModelo || p35.modelo || 'NÃO INFORMADO',
          type: p35.tipoVeiculo || 'AUTOMOVEL',
          year: p35.anoModelo ? String(p35.anoModelo) : undefined,
          yearManufacture: p35.anoFabricacao ? String(p35.anoFabricacao) : undefined,
          plate: p35.placa || placaClean,
          chassi: p35.chassi || undefined,
          source: 'infosinistros_p35',
          raw: p35
        };
      }
    } catch (err: any) {
      logger.warn(`[BASE BIN INTERNA] P35 InfoSinistros indisponível para ${placaClean}: ${err.message}`);
    }

    logger.info(`[BASE BIN INTERNA] Placa ${placaClean} NÃO localizada na base BIN interna.`);
    return null;
  }

  /**
   * Consulta Histórico de Proprietários Veiculares por Placa (PRODUTO E2)
   * A API externa devolve decrescente (mais recente primeiro).
   * Esta função reordena a lista cronologicamente da DATA MAIS ANTIGA para a MAIS RECENTE.
   */
  async consultarHistoricoProprietario(placa: string): Promise<FetchBrasilProprietarioResponse> {
    const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 1. Verificar Cache de Curto Prazo (HIT instantâneo em 0ms)
    const cached = this.veicularCache.get(cleanPlaca);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      logger.info(`[FETCHBRASIL] Cache HIT instantâneo para placa: ${cleanPlaca} (0ms)`);
      return cached.data;
    }

    // 1.5 Verificar Base Interna no Banco de Dados (Economia de Fornecedor - R$ 0,00)
    const baseInternaResult = await this.buscarE2BaseInterna(cleanPlaca);
    if (baseInternaResult) {
      this.veicularCache.set(cleanPlaca, { data: baseInternaResult, timestamp: Date.now() });
      return baseInternaResult;
    }

    // 2. Verificar se já existe chamada em voo (Deduplicação / Singleflight)
    if (this.veicularInFlight.has(cleanPlaca)) {
      logger.info(`[FETCHBRASIL] Deduplicando chamada em voo para placa: ${cleanPlaca}`);
      return await this.veicularInFlight.get(cleanPlaca)!;
    }

    // 3. Executar chamada com resiliência
    const fetchPromise = (async () => {
      const startTime = Date.now();
      const maxAttempts = 2;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            logger.info(`[FETCHBRASIL] Tentativa de retry ${attempt}/${maxAttempts} para placa: ${cleanPlaca}...`);
            await new Promise((r) => setTimeout(r, 1200));
          } else {
            logger.info(`[FETCHBRASIL] Consultando histórico de proprietários para placa: ${cleanPlaca}`);
          }

          const response = await this.client.get('/', {
            params: {
              token: this.token,
              api: 'historico_proprietario',
              query: cleanPlaca,
            },
          });

          const processingTime = Date.now() - startTime;
          logger.info(`[FETCHBRASIL] Sucesso na consulta de proprietários (${processingTime}ms) para ${cleanPlaca}`);

          const rawData = response.data;

          if (isFetchBrasilNotFound(rawData, response.status)) {
            const notFoundResult: FetchBrasilProprietarioResponse = {
              success: true,
              placa: cleanPlaca,
              renavam: '',
              consulta_em: new Date().toISOString(),
              total: 0,
              historico: [],
              message: extractFetchBrasilMessage(rawData) || 'Nenhum histórico de proprietários encontrado para a placa informada.',
              api_central: rawData?.api_central || {
                api_utilizada: 'historico_proprietario',
                parametro_utilizado: 'placa',
                query_fornecida: cleanPlaca,
                timestamp: new Date().toISOString(),
              }
            };
            return notFoundResult;
          }

          // Se a API retornou erro ou falha explícita de resolução ("resolve_failed" ou success: false), aborta com manutenção
          if (
            rawData &&
            (rawData.success === false ||
             rawData.error === 'resolve_failed' ||
             rawData.erro === 'resolve_failed' ||
             (rawData.error && !isFetchBrasilNotFound(rawData, response.status)))
          ) {
            logger.warn(`[FETCHBRASIL] Endpoint historico_proprietario retornou erro/resolve_failed: ${extractFetchBrasilMessage(rawData)}`);
            throw new Error('Estamos em manutenção, tente mais tarde');
          }

          let historicoOrdenado: HistoricoProprietarioItem[] = [];

          if (rawData && Array.isArray(rawData.historico)) {
            // Clonar array para não mutar objeto bruto
            historicoOrdenado = [...rawData.historico];

            // ORDENAÇÃO CRONOLÓGICA ASCENDENTE: DA MAIS ANTIGA PARA A MAIS RECENTE
            historicoOrdenado.sort((a, b) => {
              const timeA = this.parseDataHora(a.data, a.hora);
              const timeB = this.parseDataHora(b.data, b.hora);
              return timeA - timeB; // Menor timestamp primeiro (mais antiga)
            });

            // Reatribuir a numeração de ordem cronológica (1 = 1º proprietário histórico)
            historicoOrdenado = historicoOrdenado.map((item, idx) => ({
              ...item,
              ordem: idx + 1,
            }));
          }

          // Enriquecimento inteligente de Razão Social para registros com CNPJ
          await enrichProprietariosWithCnpj({
            proprietario_atual: rawData?.proprietario_atual,
            historico: historicoOrdenado,
          });

          const result: FetchBrasilProprietarioResponse = {
            success: rawData?.success !== false,
            placa: rawData?.placa || cleanPlaca,
            renavam: rawData?.renavam || '',
            consulta_em: rawData?.consulta_em || new Date().toISOString(),
            total: rawData?.total !== undefined ? rawData.total : historicoOrdenado.length,
            proprietario_atual: rawData?.proprietario_atual || undefined,
            historico: historicoOrdenado,
            message: rawData?.message || null,
            api_central: rawData?.api_central || {
              api_utilizada: 'historico_proprietario',
              parametro_utilizado: 'placa',
              query_fornecida: cleanPlaca,
              timestamp: new Date().toISOString(),
            }
          };

          // Armazenar no cache em memória SOMENTE quando há dados reais positivos
          if (result.total > 0 && Array.isArray(result.historico) && result.historico.length > 0) {
            this.veicularCache.set(cleanPlaca, { data: result, timestamp: Date.now() });
            this.cleanExpiredCache();
          }

          return result;
        } catch (error: any) {
          const status = error.response?.status;
          const respData = error.response?.data;

          if (isFetchBrasilNotFound(respData, status)) {
            const attemptTime = Date.now() - startTime;
            logger.info(`[FETCHBRASIL] Registro não encontrado (404/Not Found) para placa ${cleanPlaca} em ${attemptTime}ms: ${extractFetchBrasilMessage(respData)}`);
            const notFoundResult: FetchBrasilProprietarioResponse = {
              success: true,
              placa: cleanPlaca,
              renavam: '',
              consulta_em: new Date().toISOString(),
              total: 0,
              historico: [],
              message: extractFetchBrasilMessage(respData) || 'Nenhum histórico de proprietários encontrado para a placa informada.',
              api_central: respData?.api_central || {
                api_utilizada: 'historico_proprietario',
                parametro_utilizado: 'placa',
                query_fornecida: cleanPlaca,
                timestamp: new Date().toISOString(),
              }
            };
            return notFoundResult;
          }

          lastError = error;
          const attemptTime = Date.now() - startTime;
          const errorMsg = extractFetchBrasilMessage(respData) || error.message;
          logger.warn(`[FETCHBRASIL] Falha na tentativa ${attempt}/${maxAttempts} após ${attemptTime}ms para placa ${cleanPlaca}: ${errorMsg}`);

          if (status && [400, 401, 403, 404].includes(status)) {
            break;
          }
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalMsg = extractFetchBrasilMessage(lastError?.response?.data) || lastError?.message || 'Estamos em manutenção, tente mais tarde';
      logger.error(`[FETCHBRASIL] Erro na consulta após ${totalProcessingTime}ms para placa ${cleanPlaca}: ${finalMsg}`);
      throw new Error('Estamos em manutenção, tente mais tarde');
    })();

    this.veicularInFlight.set(cleanPlaca, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.veicularInFlight.delete(cleanPlaca);
    }
  }

  /**
   * Consulta genérica com tolerância a falhas e cascata de contingências transparentes
   * Suporta qualquer um dos 19 produtos (E1 a E19) ou seus slugs.
   */
  async consultarProdutoComContingencia(
    productCodeOrSlug: string,
    query: string,
    extraParams?: { tipo?: string }
  ): Promise<{
    product: ServerProductConfig;
    normalized: NormalizedResult;
    raw: any;
    providerUsed: string;
    processingTimeMs: number;
  }> {
    const product = findServerProduct(productCodeOrSlug);
    if (!product) {
      throw new Error(`Produto não encontrado ou não cadastrado no catálogo: ${productCodeOrSlug}`);
    }

    const cleanQuery = query.trim();
    const cacheKey = `${product.code}:${cleanQuery}${extraParams?.tipo ? ':' + extraParams.tipo : ''}`;

    // 1. Checar cache em memória (0ms)
    const cached = this.genericCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      logger.info(`[FETCHBRASIL] Cache HIT para produto ${product.code} (${cleanQuery}) [0ms]`);
      return {
        product,
        normalized: cached.data,
        raw: null,
        providerUsed: cached.providerUsed,
        processingTimeMs: 0
      };
    }

    // 1.5 Base Interna Prioritária para E2 (Histórico de Proprietários - Custo ZERO de fornecedor)
    if (product.code === 'E2') {
      const cleanPlaca = cleanQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const baseInternaResult = await this.buscarE2BaseInterna(cleanPlaca);
      if (baseInternaResult) {
        const normalized = normalizeProductResult('E2', baseInternaResult, cleanPlaca);
        this.genericCache.set(cacheKey, {
          data: normalized,
          timestamp: Date.now(),
          providerUsed: 'base_interna_renacred'
        });
        return {
          product,
          normalized,
          raw: baseInternaResult,
          providerUsed: 'base_interna_renacred',
          processingTimeMs: 5
        };
      }
    }

    // 1.6 Fluxo Especial Pericial para E19 (Busca de RENAVAM por Placa)
    // Regra Pericial: placa_df -> se resposta vazia -> base BIN interna -> se negativa -> placa_serpro -> se veículo não encontrado -> laudo negativo tarifado normalmente
    if (product.code === 'E19') {
      const cleanPlaca = cleanQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return await this.consultarE19FluxoEspecial(product, cleanPlaca);
    }

    // 2. Deduplicação em voo (Singleflight)
    if (this.genericInFlight.has(cacheKey)) {
      logger.info(`[FETCHBRASIL] Deduplicando chamada em voo para ${product.code}:${cleanQuery}`);
      const inFlightRes = await this.genericInFlight.get(cacheKey)!;
      return {
        product,
        ...inFlightRes
      };
    }

    // 3. Execução em cascata (Primário -> Contingências)
    const fetchPromise = (async () => {
      const startTime = Date.now();
      const endpointsToTry = [product.apiPrimary, ...product.apiContingencies];
      let lastError: any = null;
      let rawData: any = null;
      let notFoundData: any = null;
      let notFoundEndpoint = '';
      let successfulEndpoint = '';

      for (let i = 0; i < endpointsToTry.length; i++) {
        const endpoint = endpointsToTry[i];
        const isContingency = i > 0;
        logger.info(`[FETCHBRASIL] ${isContingency ? 'CONTINGÊNCIA' : 'PRIMÁRIO'}: Tentando endpoint '${endpoint}' para produto ${product.code}...`);

        const queryParams: any = {
          token: this.token,
          api: endpoint,
          query: cleanQuery
        };
        if (extraParams?.tipo) {
          queryParams.tipo = extraParams.tipo;
        }

        try {
          const response = await this.client.get('/', {
            params: queryParams
          });

          const data = response.data;
          if (isFetchBrasilNotFound(data, response.status)) {
            logger.info(`[FETCHBRASIL] Endpoint '${endpoint}' retornou 'Registro não encontrado' (${response.status}) para ${product.code}`);
            notFoundData = data;
            notFoundEndpoint = endpoint;
            continue;
          }

          // Verificar se resposta é válida (não é erro de negócio nem falha de resolução)
          const isSuccess = data &&
            typeof data === 'object' &&
            !Buffer.isBuffer(data) &&
            data.success !== false &&
            !data.erro &&
            (!data.error || data.error === '0' || data.error === false);

          if (isSuccess) {
            rawData = data;
            successfulEndpoint = endpoint;
            logger.info(`[FETCHBRASIL] Sucesso no endpoint '${endpoint}' para ${product.code} em ${Date.now() - startTime}ms`);
            break;
          } else {
            const warnMsg = extractFetchBrasilMessage(data) || 'Sem dados';
            logger.warn(`[FETCHBRASIL] Endpoint '${endpoint}' retornou aviso/erro: ${warnMsg}`);
            lastError = new Error(warnMsg);
          }
        } catch (err: any) {
          const status = err.response?.status;
          const respData = err.response?.data;

          if (isFetchBrasilNotFound(respData, status)) {
            logger.info(`[FETCHBRASIL] Endpoint '${endpoint}' respondeu 404 / Registro não encontrado para ${product.code} (${cleanQuery}): ${extractFetchBrasilMessage(respData)}`);
            notFoundData = respData || {
              success: false,
              error: 'Registro não encontrado',
              message: `Nenhum registro encontrado para o parâmetro informado no produto ${product.code}.`,
              api_central: {
                api_utilizada: endpoint,
                parametro_utilizado: 'query',
                query_fornecida: cleanQuery,
                timestamp: new Date().toISOString()
              }
            };
            notFoundEndpoint = endpoint;
            continue;
          }

          lastError = err;
          const msg = extractFetchBrasilMessage(respData) || err.message;
          logger.warn(`[FETCHBRASIL] Falha no endpoint '${endpoint}' (${status || 'timeout'}): ${msg}`);

          // Resiliência contra oscilações de bases governamentais federais (ex: E21 SERPRO / E22 SENATRAN)
          const isTimeoutOrNetwork =
            err.code === 'ECONNABORTED' ||
            err.code === 'ETIMEDOUT' ||
            (err.message && err.message.toLowerCase().includes('timeout'));

          if (isTimeoutOrNetwork && !isContingency && endpointsToTry.length === 1) {
            logger.warn(`[FETCHBRASIL] Timeout no endpoint '${endpoint}' para ${product.code} (${Date.now() - startTime}ms). Realizando retry automático...`);
            try {
              const retryResponse = await this.client.get('/', {
                params: queryParams,
                timeout: 60000
              });
              const retryData = retryResponse.data;
              const isRetrySuccess = retryData &&
                typeof retryData === 'object' &&
                !Buffer.isBuffer(retryData) &&
                retryData.success !== false &&
                !retryData.erro &&
                (!retryData.error || retryData.error === '0' || retryData.error === false) &&
                !isFetchBrasilNotFound(retryData, retryResponse.status);

              if (isRetrySuccess) {
                rawData = retryData;
                successfulEndpoint = endpoint;
                lastError = null;
                logger.info(`[FETCHBRASIL] Sucesso no retry do endpoint '${endpoint}' para ${product.code} em ${Date.now() - startTime}ms`);
                break;
              }
            } catch (retryErr: any) {
              logger.warn(`[FETCHBRASIL] Retry do endpoint '${endpoint}' também falhou: ${retryErr.message}`);
            }
          }

          // Se for erro de cliente (400, 401, 403), não adianta tentar contingências
          if (status && [400, 401, 403].includes(status)) {
            break;
          }
        }
      }

      // Se nenhum endpoint retornou dados positivos, mas houve "Registro não encontrado" legítimo de fonte oficial:
      if (!rawData && notFoundData) {
        rawData = {
          ...notFoundData,
          isNotFound: true,
          declaracoes: notFoundData.declaracoes || [],
          total_declaracoes: 0,
          mensagem: extractFetchBrasilMessage(notFoundData) || 'Registro não encontrado nas bases oficiais.'
        };
        successfulEndpoint = notFoundEndpoint || product.apiPrimary;
        lastError = null;
      }

      if (!rawData && !notFoundData) {
        throw new Error('Estamos em manutenção, tente mais tarde');
      }

      if (!rawData && lastError) {
        throw new Error('Estamos em manutenção, tente mais tarde');
      }

      // Enriquecimento inteligente para E10 (Comunicação de Venda)
      if (product.code === 'E10' && rawData && !rawData.isNotFound) {
        const cartorio = rawData.dados_veiculo_cartorio;
        if (cartorio && !cartorio.nome_proprietario_crv) {
          try {
            logger.info(`[FETCHBRASIL] E10: Buscando Razão Social/Nome do proprietário no CRV para a placa ${cleanQuery} via Senatran...`);
            const senaRes = await this.client.get('/', {
              params: {
                token: this.token,
                api: 'placa_senatran',
                query: cleanQuery
              },
              timeout: 10000
            });
            const senaVeic = senaRes?.data?.veiculo;
            if (senaVeic?.nomeProprietario) {
              cartorio.nome_proprietario_crv = senaVeic.nomeProprietario;
              rawData.veiculo_detalhes = senaVeic;
              logger.info(`[FETCHBRASIL] E10 enriquecido com sucesso: ${senaVeic.nomeProprietario}`);
            }
          } catch (err: any) {
            logger.warn(`[FETCHBRASIL] Não foi possível enriquecer proprietário E10 via Senatran: ${err.message}`);
          }
        }
      }

      // Enriquecimento inteligente para E12 (BIN Online) se faltar proprietário
      if (product.code === 'E12' && rawData && !rawData.isNotFound) {
        const hasOwner = !!(
          rawData.nomeProprietario ||
          rawData.veiculo?.nomeProprietario ||
          rawData.proprietario_nome ||
          rawData.extra?.proprietario
        );
        if (!hasOwner && cleanQuery) {
          try {
            logger.info(`[FETCHBRASIL] E12: Buscando dados de proprietário da placa ${cleanQuery} via Senatran...`);
            const senaRes = await this.client.get('/', {
              params: {
                token: this.token,
                api: 'placa_senatran',
                query: cleanQuery
              },
              timeout: 10000
            });
            const senaVeic = senaRes?.data?.veiculo;
            if (senaVeic) {
              if (senaVeic.nomeProprietario && !rawData.nomeProprietario) {
                rawData.nomeProprietario = senaVeic.nomeProprietario;
              }
              if (senaVeic.niProprietario && !rawData.numeroIdentificacaoProprietario) {
                rawData.numeroIdentificacaoProprietario = senaVeic.niProprietario;
              }
              if (senaVeic.numeroMotor && !rawData.numeroMotor) {
                rawData.numeroMotor = senaVeic.numeroMotor;
              }
              logger.info(`[FETCHBRASIL] E12 enriquecido com sucesso via Senatran: ${senaVeic.nomeProprietario || ''}`);
            }
          } catch (err: any) {
            logger.warn(`[FETCHBRASIL] Não foi possível enriquecer proprietário E12 via Senatran: ${err.message}`);
          }
        }
      }

      // Enriquecimento inteligente para E5 (Roubo e Furto): se renavam_ocorrencia não trouxe a data exata, busca em ocorrencias_senatran
      if (product.code === 'E5' && rawData && !rawData.isNotFound && Array.isArray(rawData.ocorrencias)) {
        const precisaDeData = rawData.ocorrencias.some((o: any) => !o.data && !o.boletim_ocorrencia?.data);
        if (precisaDeData && cleanQuery) {
          try {
            logger.info(`[FETCHBRASIL] E5: Enriquecendo boletins com datas exatas e municípios via ocorrencias_senatran para a placa ${cleanQuery}...`);
            const senaRes = await this.client.get('/', {
              params: {
                token: this.token,
                api: 'ocorrencias_senatran',
                query: cleanQuery
              },
              timeout: 15000
            });
            const listaSena = Array.isArray(senaRes?.data?.ocorrencias) ? senaRes.data.ocorrencias : [];
            for (const s of listaSena) {
              const numS = String(s.numeroBoletimAno || s.numero_boletim || s.num_bo || '').trim();
              for (const o of rawData.ocorrencias) {
                const bo = o.boletim_ocorrencia || {};
                const numO = String(bo.num || o.num_bo || bo.numero || o.numeroBoletimAno || '').trim();
                if (numS && numO && (numO.includes(numS) || numS.includes(numO))) {
                  if (s.data) {
                    if (!bo.data) bo.data = s.data;
                    o.data = s.data;
                  }
                  if (s.municipio) {
                    if (!bo.municipio) bo.municipio = s.municipio;
                    o.municipio = s.municipio;
                  }
                  if (s.descricao && !o.descricao) {
                    o.descricao = s.descricao;
                  }
                }
              }
            }
          } catch (err: any) {
            logger.warn(`[FETCHBRASIL] Não foi possível enriquecer ocorrências E5 via ocorrencias_senatran: ${err.message}`);
          }
        }
      }

      // Enriquecimento inteligente para E2 (Histórico de Proprietários) para garantir Razão Social em todos os CNPJs
      if (product.code === 'E2' && rawData && !rawData.isNotFound) {
        await enrichProprietariosWithCnpj(rawData);
      }

      // Normalização pericial e higienização de dados
      const normalized = normalizeProductResult(product.code, rawData || {}, cleanQuery, extraParams);
      const processingTimeMs = Date.now() - startTime;

      // Gravar no cache de curto prazo SOMENTE quando houver dados positivos legítimos
      if (normalized.totalRegistros > 0 && !rawData?.isNotFound) {
        this.genericCache.set(cacheKey, {
          data: normalized,
          timestamp: Date.now(),
          providerUsed: successfulEndpoint || product.apiPrimary
        });
        this.cleanExpiredCache();
      }

      return {
        normalized,
        raw: rawData,
        providerUsed: successfulEndpoint || product.apiPrimary,
        processingTimeMs
      };
    })();

    this.genericInFlight.set(cacheKey, fetchPromise);
    try {
      const res = await fetchPromise;
      return {
        product,
        ...res
      };
    } finally {
      this.genericInFlight.delete(cacheKey);
    }
  }

  /**
   * Fluxo Especial Pericial para o produto E19 (Busca de RENAVAM por Placa):
   * 1. Consulta primária na API placa_df.
   * 2. Se a API responder "Resposta vazia" / "O DETRAN-DF não retornou conteúdo na resposta desta placa.":
   *    -> Verifica se a placa existe na Base BIN interna (veiculos_base_bin / histórico / P35).
   * 3. Se a base BIN interna for negativa:
   *    -> Realiza a consulta na API placa_serpro.
   * 4. Se a placa_serpro retornar "Veículo não encontrado" / "Consulta concluída: veículo não encontrado no SERPRO...":
   *    -> Cobra normalmente (houve trabalho de pesquisa pericial) e informa ao cliente que o veículo não existe.
   */
  async consultarE19FluxoEspecial(
    product: ServerProductConfig,
    cleanPlaca: string
  ): Promise<{
    product: ServerProductConfig;
    normalized: NormalizedResult;
    raw: any;
    providerUsed: string;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    let rawData: any = null;
    let providerUsed = 'placa_df';
    let placaDfVazia = false;

    // Passo 1: Consulta primária na API placa_df
    try {
      logger.info(`[E19] Passo 1: Consultando endpoint primário 'placa_df' para ${cleanPlaca}...`);
      const response = await this.client.get('/', {
        params: {
          token: this.token,
          api: 'placa_df',
          query: cleanPlaca
        }
      });
      const data = response.data;

      if (this.isPlacaDfRespostaVazia(data)) {
        logger.info(`[E19] placa_df respondeu com 'Resposta vazia' / DETRAN-DF sem conteúdo para ${cleanPlaca}`);
        placaDfVazia = true;
      } else if (
        data &&
        typeof data === 'object' &&
        data.success !== false &&
        !data.erro &&
        (!data.error || data.error === '0' || data.error === false)
      ) {
        // Sucesso no placa_df
        rawData = data;
        providerUsed = 'placa_df';
        logger.info(`[E19] Sucesso no endpoint 'placa_df' para ${cleanPlaca} em ${Date.now() - startTime}ms`);
      } else {
        placaDfVazia = true;
      }
    } catch (dfErr: any) {
      const respData = dfErr.response?.data;
      if (this.isPlacaDfRespostaVazia(respData)) {
        logger.info(`[E19] placa_df retornou erro HTTP indicando 'Resposta vazia' para ${cleanPlaca}`);
        placaDfVazia = true;
      } else {
        logger.warn(`[E19] Falha na chamada placa_df para ${cleanPlaca}: ${dfErr.message}`);
        placaDfVazia = true;
      }
    }

    // Passo 2: Se placa_df respondeu vazia, "Verificar se a placa existe na base BIN interna."
    if (placaDfVazia && !rawData) {
      logger.info(`[E19] Passo 2: Verificando se a placa ${cleanPlaca} existe na Base BIN interna...`);
      const binInterna = await this.buscarBinInterna(cleanPlaca);

      if (binInterna && binInterna.renavam) {
        logger.info(`[E19] Sucesso na Base BIN interna para ${cleanPlaca}! RENAVAM: ${binInterna.renavam} (Origem: ${binInterna.source})`);
        rawData = {
          success: true,
          origem: 'BASE_INTERNA_BIN',
          vehicle: {
            plate: cleanPlaca,
            renavam: binInterna.renavam,
            name: binInterna.name || 'NÃO INFORMADO',
            type: binInterna.type || 'AUTOMOVEL',
            year: binInterna.year,
            yearManufacture: binInterna.yearManufacture,
            chassi: binInterna.chassi
          },
          api_central: {
            api_utilizada: 'base_bin_interna',
            origem: binInterna.source,
            parametro_utilizado: 'placa',
            query_fornecida: cleanPlaca,
            cache_interno: true,
            timestamp: new Date().toISOString()
          }
        };
        providerUsed = 'base_interna_renacred';
      } else {
        // Passo 3: "Se a resposta for negativa, realizar a consulta na api placa_serpro..."
        logger.info(`[E19] Passo 3: Base BIN interna negativa para ${cleanPlaca}. Consultando API 'placa_serpro'...`);
        try {
          const serproResp = await this.client.get('/', {
            params: {
              token: this.token,
              api: 'placa_serpro',
              query: cleanPlaca
            }
          });
          const serproData = serproResp.data;

          if (this.isSerproVeiculoNaoEncontrado(serproData)) {
            logger.info(`[E19] placa_serpro confirmou: veículo ${cleanPlaca} NÃO encontrado no SERPRO.`);
            rawData = {
              success: false,
              isNotFound: true,
              isVeiculoInexistente: true,
              error: 'Veículo não encontrado',
              mensagem: `O veículo de placa ${cleanPlaca} não existe nas bases oficiais de trânsito (SERPRO/SENATRAN).`,
              message: serproData.message || 'Consulta concluída: veículo não encontrado no SERPRO para os dados informados.',
              placa_consultada: cleanPlaca,
              api_central: {
                api_utilizada: 'placa_serpro',
                parametro_utilizado: 'placa',
                query_fornecida: cleanPlaca,
                timestamp: new Date().toISOString()
              }
            };
            providerUsed = 'placa_serpro';
          } else if (
            serproData &&
            typeof serproData === 'object' &&
            serproData.success !== false &&
            !serproData.erro &&
            (!serproData.error || serproData.error === '0' || serproData.error === false)
          ) {
            logger.info(`[E19] Sucesso na consulta placa_serpro para ${cleanPlaca}`);
            rawData = serproData;
            providerUsed = 'placa_serpro';
          } else if (isFetchBrasilNotFound(serproData, serproResp.status)) {
            logger.info(`[E19] placa_serpro retornou 'Registro não encontrado' (${serproResp.status}) para ${cleanPlaca}`);
            rawData = {
              success: false,
              isNotFound: true,
              isVeiculoInexistente: true,
              error: 'Veículo não encontrado',
              mensagem: `O veículo de placa ${cleanPlaca} não existe nas bases oficiais de trânsito (SERPRO/SENATRAN).`,
              message: extractFetchBrasilMessage(serproData) || 'Consulta concluída: veículo não encontrado no SERPRO para os dados informados.',
              placa_consultada: cleanPlaca,
              api_central: {
                api_utilizada: 'placa_serpro',
                parametro_utilizado: 'placa',
                query_fornecida: cleanPlaca,
                timestamp: new Date().toISOString()
              }
            };
            providerUsed = 'placa_serpro';
          } else {
            const errSerproMsg = extractFetchBrasilMessage(serproData) || 'Falha no SERPRO';
            logger.warn(`[E19] Resposta inesperada do SERPRO para ${cleanPlaca}: ${errSerproMsg}`);
            throw new Error(errSerproMsg);
          }
        } catch (serproErr: any) {
          const sData = serproErr.response?.data;
          const status = serproErr.response?.status;
          if (this.isSerproVeiculoNaoEncontrado(sData) || isFetchBrasilNotFound(sData, status)) {
            logger.info(`[E19] placa_serpro erro HTTP confirmando veículo ${cleanPlaca} inexistente.`);
            rawData = {
              success: false,
              isNotFound: true,
              isVeiculoInexistente: true,
              error: 'Veículo não encontrado',
              mensagem: `O veículo de placa ${cleanPlaca} não existe nas bases oficiais de trânsito (SERPRO/SENATRAN).`,
              message: sData?.message || 'Consulta concluída: veículo não encontrado no SERPRO para os dados informados.',
              placa_consultada: cleanPlaca,
              api_central: {
                api_utilizada: 'placa_serpro',
                parametro_utilizado: 'placa',
                query_fornecida: cleanPlaca,
                timestamp: new Date().toISOString()
              }
            };
            providerUsed = 'placa_serpro';
          } else {
            logger.error(`[E19] Erro crítico ao consultar placa_serpro para ${cleanPlaca}: ${serproErr.message}`);
            throw new Error('Estamos em manutenção, tente mais tarde');
          }
        }
      }
    }

    if (!rawData) {
      throw new Error('Estamos em manutenção, tente mais tarde');
    }

    const normalized = normalizeProductResult('E19', rawData, cleanPlaca);

    // Salvar no cache em memória se positivo ou não encontrado oficial
    const cacheKey = `E19:${cleanPlaca}`;
    this.genericCache.set(cacheKey, {
      data: normalized,
      timestamp: Date.now(),
      providerUsed
    });

    return {
      product,
      normalized,
      raw: rawData,
      providerUsed,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Consulta direta Produto E17: Busca por Nome Completo
   */
  async consultarNomeBasico(nome: string) {
    return this.consultarProdutoComContingencia('E17', nome);
  }

  /**
   * Consulta direta Produto E18: Busca por Nome de Mãe/Pai (Filiação)
   */
  async consultarRegFiliacao(nome: string, tipo: string = 'mae') {
    return this.consultarProdutoComContingencia('E18', nome, { tipo });
  }

  /**
   * Consulta direta Produto E19: Busca de RENAVAM por Placa
   */
  async consultarPlacaDf(placa: string) {
    return this.consultarProdutoComContingencia('E19', placa);
  }
}

export const fetchbrasilService = new FetchBrasilService();

