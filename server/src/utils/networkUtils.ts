import { Request } from 'express';

export interface ClientNetworkInfo {
  ip: string;
  country: string;
  state: string;
  city: string;
  locationLabel: string;
  isInternalTest: boolean;
}

/**
 * Lista de faixas/prefixos conhecidos da equipe Renacred (SC / PR) para testes
 */
const TEST_IP_PATTERNS = [
  '179.108.165.', // Contato Internet / SC
  '177.69.51.',   // Algar / Curitiba PR
  '2804:ef4:',    // IPv6 SC
  '127.0.0.1',
  '::1',
  'localhost'
];

/**
 * Extrai o IP real do cliente e dados de geolocalização recebidos por proxy/Cloudflare
 */
export function getClientNetworkInfo(req: Request): ClientNetworkInfo {
  const headers = req.headers || {};

  // 1. Obter IP Real
  const cfConnectingIp = headers['cf-connecting-ip'] as string;
  const xRealIp = headers['x-real-ip'] as string;
  const xForwardedFor = headers['x-forwarded-for'] as string;

  let rawIp = cfConnectingIp || xRealIp;
  if (!rawIp && xForwardedFor) {
    rawIp = xForwardedFor.split(',')[0].trim();
  }
  if (!rawIp) {
    rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  // Normalizar IPv6-mapped IPv4 (ex: ::ffff:192.168.1.1 -> 192.168.1.1)
  const cleanIp = rawIp.replace(/^::ffff:/, '').trim();

  // 2. Extrair dados de geolocalização do Cloudflare
  const country = String(headers['cf-ipcountry'] || (cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.') || cleanIp === '127.0.0.1' ? 'LOCAL' : 'BR')).toUpperCase();
  const state = String(headers['cf-region'] || headers['cf-region-code'] || '').toUpperCase();
  const city = String(headers['cf-ipcity'] || '').trim();

  // 3. Verificar se é consulta de teste interna (SC / PR ou IPs da equipe)
  let isInternalTest = false;
  if (state === 'PR' || state === 'SC') {
    isInternalTest = true;
  }
  for (const pattern of TEST_IP_PATTERNS) {
    if (cleanIp.includes(pattern)) {
      isInternalTest = true;
      break;
    }
  }

  // Rótulo amigável para exibição em tabelas e planilhas
  let locationLabel = '';
  if (city && state) {
    locationLabel = `${city}/${state}`;
  } else if (state) {
    locationLabel = state;
  } else if (country && country !== 'BR' && country !== 'LOCAL') {
    locationLabel = country;
  } else if (cleanIp.startsWith('3.228.') || cleanIp.startsWith('18.229.')) {
    locationLabel = 'AWS Cloud';
  } else {
    locationLabel = country || 'BR';
  }

  return {
    ip: cleanIp,
    country,
    state,
    city,
    locationLabel,
    isInternalTest
  };
}
