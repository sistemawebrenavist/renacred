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

export class FetchBrasilService {
  private apiURL: string;
  private token: string;
  private client: AxiosInstance;

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
      timeout: 30000,
      httpsAgent: new https.Agent({ family: 4, keepAlive: true }),
      proxy: proxyConfig,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  }

  /**
   * Consulta Histórico Imobiliário por CPF ou CNPJ (sem cache)
   */
  async consultarHistoricoImobiliario(query: string): Promise<FetchBrasilImobiliarioResponse> {
    const startTime = Date.now();
    try {
      logger.info(`[FETCHBRASIL] Consultando histórico imobiliário para documento: ${query}`);

      const response = await this.client.get('/', {
        params: {
          token: this.token,
          api: 'historico_imobiliario',
          query: query,
        },
      });

      const processingTime = Date.now() - startTime;
      logger.info(`[FETCHBRASIL] Sucesso na consulta (${processingTime}ms) para ${query}`);

      const data = response.data;

      // Normalização do formato
      if (data && Array.isArray(data.declaracoes)) {
        return {
          periodo: data.periodo || '',
          total_declaracoes: data.total_declaracoes || data.declaracoes.length,
          declaracoes: data.declaracoes,
          api_central: data.api_central || {
            api_utilizada: 'historico_imobiliario',
            parametro_utilizado: 'query',
            query_fornecida: query,
            timestamp: new Date().toISOString(),
          }
        };
      }

      // Caso não tenha retornado declarações
      return {
        periodo: data?.periodo || '',
        total_declaracoes: 0,
        declaracoes: [],
        api_central: data?.api_central
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error.response?.data?.mensagem || error.response?.data?.erro || error.message;
      logger.error(`[FETCHBRASIL] Erro na consulta após ${processingTime}ms para ${query}: ${errorMsg}`);
      throw new Error(`Falha ao consultar histórico imobiliário no provedor: ${errorMsg}`);
    }
  }
}

export const fetchbrasilService = new FetchBrasilService();
