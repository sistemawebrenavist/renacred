import axios from 'axios';
import { logger } from '../utils/logger';

interface CreateCheckoutParams {
  orderNsu: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
  items: Array<{
    quantity: number;
    price: number; // em centavos
    description: string;
    id?: string;
    unit_price?: number;
    title?: string;
  }>;
}

interface CheckoutResponse {
  url: string;
}

export class InfinityPayService {
  private apiUrl: string;
  private handle: string;
  private redirectUrl: string;
  private webhookUrl: string;

  constructor() {
    this.apiUrl = process.env.INFINITYPAY_API_URL || 'https://api.checkout.infinitepay.io';
    this.handle = process.env.INFINITYPAY_HANDLE || 'godwaytecnologia';
    this.redirectUrl = process.env.INFINITYPAY_REDIRECT_URL || 'https://renacred.com.br/pagamento/sucesso';
    this.webhookUrl = process.env.INFINITYPAY_WEBHOOK_URL || 'https://api.renacred.com.br/api/webhooks/infinitypay';
  }

  /**
   * Cria um link de checkout na Infinity Pay (Pix / Cartão)
   */
  async createCheckoutLink(params: CreateCheckoutParams): Promise<CheckoutResponse> {
    try {
      const cleanHandle = this.handle.replace('$', '');

      const payload: any = {
        handle: cleanHandle,
        redirect_url: params.redirectUrl || this.redirectUrl,
        webhook_url: this.webhookUrl,
        order_nsu: params.orderNsu,
        customer: {},
        billing: {
          address: {
            country_code: 'BR'
          }
        },
        items: params.items.map(item => ({
          ...item,
          price: item.price
        }))
      };

      if (params.customerName) payload.customer.name = params.customerName;
      if (params.customerEmail) payload.customer.email = params.customerEmail;
      if (params.customerPhone) payload.customer.phone = params.customerPhone;
      if (params.metadata) payload.metadata = params.metadata;

      const endpoint = `${this.apiUrl}/links`;
      logger.info(`[INFINITYPAY] Gerando link de pagamento para NSU: ${params.orderNsu}`);

      const response = await axios.post(endpoint, payload);
      return response.data;
    } catch (error: any) {
      logger.error(`[INFINITYPAY] Erro ao criar checkout: ${error.response?.data?.message || error.message}`);
      throw new Error(error.response?.data?.message || 'Falha ao gerar link de pagamento na Infinity Pay');
    }
  }
}

export const infinityPayService = new InfinityPayService();
