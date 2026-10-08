import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { findServerProduct, ServerProductConfig } from '../config/productsCatalog';
import { normalizeProductResult, NormalizedResult } from './productNormalizers';
import { enrichProprietariosWithCnpj } from './cnpjService';


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
      timeout: 45000,
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

          if (data && Array.isArray(data.declaracoes)) {
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
          } else {
            result = {
              periodo: data?.periodo || '',
              total_declaracoes: 0,
              declaracoes: [],
              api_central: data?.api_central
            };
          }

          // Armazena no cache se teve sucesso
          this.cache.set(cleanDoc, { data: result, timestamp: Date.now() });
          this.cleanExpiredCache();

          return result;
        } catch (error: any) {
          lastError = error;
          const attemptTime = Date.now() - startTime;
          const errorMsg = error.response?.data?.mensagem || error.response?.data?.erro || error.message;
          logger.warn(`[FETCHBRASIL] Falha na tentativa ${attempt}/${maxAttempts} após ${attemptTime}ms para ${cleanDoc}: ${errorMsg}`);

          // Não tentar novamente se for erro de autorização/cliente (400, 401, 403, 404)
          if (error.response?.status && [400, 401, 403, 404].includes(error.response.status)) {
            break;
          }
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalMsg = lastError?.response?.data?.mensagem || lastError?.response?.data?.erro || lastError?.message;
      logger.error(`[FETCHBRASIL] Erro na consulta após ${totalProcessingTime}ms para ${cleanDoc}: ${finalMsg}`);
      throw new Error(`Falha ao consultar histórico imobiliário no provedor: ${finalMsg}`);
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

          // Armazenar no cache em memória
          this.veicularCache.set(cleanPlaca, { data: result, timestamp: Date.now() });
          this.cleanExpiredCache();

          return result;
        } catch (error: any) {
          lastError = error;
          const attemptTime = Date.now() - startTime;
          const errorMsg = error.response?.data?.mensagem || error.response?.data?.erro || error.message;
          logger.warn(`[FETCHBRASIL] Falha na tentativa ${attempt}/${maxAttempts} após ${attemptTime}ms para placa ${cleanPlaca}: ${errorMsg}`);

          if (error.response?.status && [400, 401, 403, 404].includes(error.response.status)) {
            break;
          }
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalMsg = lastError?.response?.data?.mensagem || lastError?.response?.data?.erro || lastError?.message;
      logger.error(`[FETCHBRASIL] Erro na consulta após ${totalProcessingTime}ms para placa ${cleanPlaca}: ${finalMsg}`);
      throw new Error(`Falha ao consultar histórico de proprietários no provedor: ${finalMsg}`);
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
      let successfulEndpoint = '';

      for (let i = 0; i < endpointsToTry.length; i++) {
        const endpoint = endpointsToTry[i];
        const isContingency = i > 0;
        logger.info(`[FETCHBRASIL] ${isContingency ? 'CONTINGÊNCIA' : 'PRIMÁRIO'}: Tentando endpoint '${endpoint}' para produto ${product.code}...`);

        try {
          const queryParams: any = {
            token: this.token,
            api: endpoint,
            query: cleanQuery
          };
          if (extraParams?.tipo) {
            queryParams.tipo = extraParams.tipo;
          }

          const response = await this.client.get('/', {
            params: queryParams
          });

          // Verificar se resposta é válida (não é erro de negócio)
          const data = response.data;
          if (data && !data.erro) {
            rawData = data;
            successfulEndpoint = endpoint;
            logger.info(`[FETCHBRASIL] Sucesso no endpoint '${endpoint}' para ${product.code} em ${Date.now() - startTime}ms`);
            break;
          } else {
            logger.warn(`[FETCHBRASIL] Endpoint '${endpoint}' retornou aviso/erro: ${data?.mensagem || data?.erro || 'Sem dados'}`);
          }
        } catch (err: any) {
          lastError = err;
          const status = err.response?.status;
          const msg = err.response?.data?.mensagem || err.message;
          logger.warn(`[FETCHBRASIL] Falha no endpoint '${endpoint}' (${status || 'timeout'}): ${msg}`);

          // Se for erro de cliente (400, 401, 403), não adianta tentar contingências
          if (status && [400, 401, 403].includes(status)) {
            break;
          }
        }
      }

      if (!rawData && lastError) {
        throw new Error(`Falha em todas as fontes oficiais consultadas para o produto ${product.code}: ${lastError.response?.data?.mensagem || lastError.message}`);
      }

      // Enriquecimento inteligente para E10 (Comunicação de Venda)
      if (product.code === 'E10' && rawData) {
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
      if (product.code === 'E12' && rawData) {
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

      // Enriquecimento inteligente para E2 (Histórico de Proprietários) para garantir Razão Social em todos os CNPJs
      if (product.code === 'E2' && rawData) {
        await enrichProprietariosWithCnpj(rawData);
      }

      // Normalização pericial e higienização de dados
      const normalized = normalizeProductResult(product.code, rawData || {}, cleanQuery, extraParams);
      const processingTimeMs = Date.now() - startTime;

      // Gravar no cache de curto prazo
      this.genericCache.set(cacheKey, {
        data: normalized,
        timestamp: Date.now(),
        providerUsed: successfulEndpoint || product.apiPrimary
      });
      this.cleanExpiredCache();

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

