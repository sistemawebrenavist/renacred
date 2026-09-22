import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

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

interface CacheEntry {
  data: FetchBrasilImobiliarioResponse;
  timestamp: number;
}

export class FetchBrasilService {
  private apiURL: string;
  private token: string;
  private client: AxiosInstance;
  
  // Cache de curto prazo em memória (10 minutos)
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  // Deduplicação de requisições simultâneas em voo (Singleflight)
  private inFlight = new Map<string, Promise<FetchBrasilImobiliarioResponse>>();

  constructor() {
    this.apiURL = process.env.FETCHBRASIL_API_URL || 'https://api.fetchbrasil.pro';
    this.token = process.env.FETCHBRASIL_API_TOKEN || 'FB-78C1-9751-7F03-D237';

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
      timeout: 15000,
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 100,
        maxFreeSockets: 30,
        timeout: 60000,
        family: 4
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

    // 3. Executar chamada e registrar na lista de voo
    const fetchPromise = (async () => {
      const startTime = Date.now();
      try {
        logger.info(`[FETCHBRASIL] Consultando histórico imobiliário para documento: ${cleanDoc}`);

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
            total_declaracoes: data.total_declaracoes || data.declaracoes.length,
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
        const processingTime = Date.now() - startTime;
        const errorMsg = error.response?.data?.mensagem || error.response?.data?.erro || error.message;
        logger.error(`[FETCHBRASIL] Erro na consulta após ${processingTime}ms para ${cleanDoc}: ${errorMsg}`);
        throw new Error(`Falha ao consultar histórico imobiliário no provedor: ${errorMsg}`);
      } finally {
        this.inFlight.delete(cleanDoc);
      }
    })();

    this.inFlight.set(cleanDoc, fetchPromise);
    return await fetchPromise;
  }
}

export const fetchbrasilService = new FetchBrasilService();
