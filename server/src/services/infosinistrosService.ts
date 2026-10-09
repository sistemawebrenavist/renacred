import https from 'https';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface InfoSinistrosProdutoItem {
  produto_id: string;
  nome: string;
  status: 'positivo' | 'negativo' | 'não contratado' | string;
  conteudo: any;
}

export interface InfoSinistrosPreVistoriaResponse {
  sucesso: boolean;
  codigo?: number | string;
  cliente?: string;
  ambiente?: string;
  query_fornecida?: string;
  duracaoMs?: number;
  produtosContratados?: string[];
  resultados?: Record<string, InfoSinistrosProdutoItem>;
  mensagem?: string;
  [key: string]: any;
}

export class InfoSinistrosService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.INFOSINISTROS_API_URL || 'https://api.infosinistros.com.br';
    this.apiKey =
      process.env.INFOSINISTROS_ADMIN_API_KEY ||
      'intg_live_admin_unlimited_5a5da8c7f970e401328e23b46e0c3d52';

    const httpsAgent = new https.Agent({
      family: 4,
      keepAlive: false,
      rejectUnauthorized: false
    });

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 25000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      httpsAgent
    });
  }

  /**
   * Executa consulta de Pré-Vistoria completa via API B2B oficial da InfoSinistros
   * com chave Super Admin ilimitada (retorna P1 a P37, incluindo BIN Fabril P35).
   */
  async consultarPreVistoria(placa: string): Promise<InfoSinistrosPreVistoriaResponse> {
    const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const startTime = Date.now();

    try {
      logger.info(`[INFOSINISTROS] Solicitando Pré-Vistoria B2B para placa ${cleanPlaca}...`);

      const response = await this.client.post('/api/v1/veiculos/consulta', {
        placa: cleanPlaca
      });

      const duracao = Date.now() - startTime;
      logger.info(
        `[INFOSINISTROS] Resposta recebida para ${cleanPlaca} em ${duracao}ms (Status: ${response.status})`
      );

      const data = response.data;
      if (data && typeof data === 'object') {
        return {
          sucesso: Boolean(data.sucesso ?? true),
          cliente: data.cliente,
          ambiente: data.ambiente,
          query_fornecida: data.query_fornecida || cleanPlaca,
          duracaoMs: duracao,
          produtosContratados: data.produtosContratados || [],
          resultados: data.resultados || {}
        };
      }

      return {
        sucesso: false,
        mensagem: 'Resposta inesperada do serviço InfoSinistros',
        resultados: {}
      };
    } catch (error: any) {
      const duracao = Date.now() - startTime;
      const msg = error.response?.data?.mensagem || error.response?.data?.detail || error.message;
      logger.error(`[INFOSINISTROS] Erro ao consultar placa ${cleanPlaca} (${duracao}ms): ${msg}`);

      return {
        sucesso: false,
        mensagem: msg,
        resultados: {}
      };
    }
  }
}

export const infosinistrosService = new InfoSinistrosService();
