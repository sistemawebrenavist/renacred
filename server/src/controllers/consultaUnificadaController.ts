import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { syncVeicularToInfosinistros } from '../services/syncToInfosinistrosService';
import { billingService, BillingCheckResult } from '../services/billing.service';
import { findServerProduct, ServerProductConfig } from '../config/productsCatalog';
import { validateIdentifier, sanitizeCpfCnpj } from '../utils/cpfCnpjValidator';
import { validatePlaca } from './veicularController';
import { logger } from '../utils/logger';
import { QuerySource, QueryStatus } from '../types/database';
import { e20Service } from '../services/e20Service';
import { e24Service } from '../services/e24Service';
import { normalizeE20, normalizeE24, NormalizedResult } from '../services/productNormalizers';
import { getClientNetworkInfo } from '../utils/networkUtils';

interface CachedQueryEntry {
  timestamp: number;
  responsePayload: any;
  queryId: string;
}

// Cache em memória de curto prazo (10 segundos) para deduplicação de requisições simultâneas
const recentQueriesDedupCache = new Map<string, CachedQueryEntry>();

// Limpeza periódica do cache a cada 60 segundos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of recentQueriesDedupCache.entries()) {
    if (now - entry.timestamp > 30000) {
      recentQueriesDedupCache.delete(key);
    }
  }
}, 60000);

/**
 * Validador genérico por tipo de input configurado no produto
 */
export function validateProductInput(
  inputType: 'cpf_cnpj' | 'cpf' | 'placa' | 'rg' | 'chassi' | 'renavam' | 'nome',
  inputValue: string
): { valid: boolean; cleaned: string; error?: string } {
  if (!inputValue || typeof inputValue !== 'string') {
    return { valid: false, cleaned: '', error: 'O parâmetro de pesquisa é obrigatório.' };
  }

  const raw = inputValue.trim();

  switch (inputType) {
    case 'cpf_cnpj': {
      const val = validateIdentifier(raw);
      if (!val.valid) {
        return { valid: false, cleaned: '', error: 'Documento informado é inválido. Digite um CPF ou CNPJ válido.' };
      }
      return { valid: true, cleaned: val.cleaned };
    }
    case 'cpf': {
      const digits = sanitizeCpfCnpj(raw);
      if (digits.length !== 11) {
        return { valid: false, cleaned: '', error: 'CPF deve conter exatamente 11 dígitos numéricos.' };
      }
      const val = validateIdentifier(digits);
      if (!val.valid || val.type !== 'CPF') {
        return { valid: false, cleaned: '', error: 'CPF informado é inválido.' };
      }
      return { valid: true, cleaned: val.cleaned };
    }
    case 'placa': {
      const val = validatePlaca(raw);
      if (!val.valid) {
        return {
          valid: false,
          cleaned: '',
          error: 'Placa informada é inválida. Utilize o formato tradicional (ABC-1234) ou Mercosul (ABC1D23).'
        };
      }
      return { valid: true, cleaned: val.cleaned };
    }
    case 'chassi': {
      const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleaned.length !== 17) {
        return { valid: false, cleaned: '', error: 'Chassi deve conter exatamente 17 caracteres alfanuméricos.' };
      }
      return { valid: true, cleaned };
    }
    case 'renavam': {
      const cleaned = raw.replace(/\D/g, '');
      if (cleaned.length < 9 || cleaned.length > 11) {
        return { valid: false, cleaned: '', error: 'Renavam deve conter entre 9 e 11 dígitos numéricos.' };
      }
      return { valid: true, cleaned };
    }
    case 'rg': {
      const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleaned.length < 3 || cleaned.length > 20) {
        return { valid: false, cleaned: '', error: 'Número do RG deve conter entre 3 e 20 caracteres.' };
      }
      return { valid: true, cleaned };
    }
    case 'nome': {
      const cleaned = String(raw).replace(/\s+/g, ' ').trim().toUpperCase();
      const parts = cleaned.split(' ');
      if (parts.length < 2 || cleaned.length < 5) {
        return {
          valid: false,
          cleaned: '',
          error: 'Informe o nome completo (ao menos duas palavras, mínimo de 5 caracteres).'
        };
      }
      return { valid: true, cleaned };
    }
    default:
      return { valid: true, cleaned: raw };
  }
}

/**
 * Gerador de hash oficial pericial da Renacred para autenticidade do laudo
 */
export function generatePericialHash(productCode: string, query: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${productCode}:${query}:${Date.now()}:${Math.random()}`)
    .digest('hex')
    .substring(0, 10)
    .toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RNC-${productCode.toUpperCase()}-${hash}-${dateStr}`;
}

/**
 * Endpoint Web Autenticado (via JWT) para o Portal do Assinante / Hub de Consulta
 * POST /api/consultas/:codigo
 */
export const executarConsultaWeb = async (req: any, res: Response) => {
  const startTime = Date.now();
  const networkInfo = getClientNetworkInfo(req);
  const { codigo } = req.params;
  const companyId = req.user.companyId;
  const userId = req.user.id;
  const isSuperAdmin = !!req.user?.isSuperAdmin;

  // 1. Resolver produto no catálogo
  const product = findServerProduct(codigo);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Produto '${codigo}' não foi localizado no catálogo oficial da Renacred.`
    });
  }

  // 2. Extrair e validar parâmetro de busca
  const queryParam = req.body?.query || req.body?.parametro || req.body?.documento || req.body?.placa || req.body?.cpf || req.body?.rg || req.body?.nome;
  const validation = validateProductInput(product.inputType, queryParam);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }

  const cleanQuery = validation.cleaned;
  const dedupKey = `${companyId}_${product.code}_${cleanQuery}`;

  // 3. Checagem de elegibilidade e faturamento
  let company = req.user?.company;
  if (!company && companyId) {
    company = await prisma.company.findUnique({ where: { id: companyId } });
  }

  let eligibility: BillingCheckResult = { allowed: true, price: product.defaultPrice };

  // 3.1 Governança B2B: Checar se o produto está contratado pela empresa (obrigatório para consultas web)
  const allowedProducts: string[] = company?.allowedProducts || ['ALL'];
  const isContracted = allowedProducts.includes('ALL') || allowedProducts.some(p => p.toUpperCase() === product.code.toUpperCase());

  if (!isContracted) {
    return res.status(403).json({
      success: false,
      type: 'https://renacred.com.br/errors/product-not-allowed',
      title: 'Produto Não Contratado',
      status: 403,
      detail: `A sua organização não possui permissão para consumir o produto ${product.code} (${product.name}). Entre em contato com seu gestor para liberação.`,
      code: 'PRODUCT_NOT_ALLOWED',
      message: `O produto ${product.code} (${product.name}) não está habilitado no plano contratado da sua organização. Entre em contato com seu gestor comercial para liberação imediata.`
    });
  }

  if (!isSuperAdmin) {
    const check = await billingService.checkEligibility(companyId, company, product.code);
    if (!check.allowed) {
      return res.status(402).json({
        success: false,
        code: check.code,
        message: check.message
      });
    }

    // 3.2 Preço efetivo: customPrices[code] > defaultPrice (customQueryPrice apenas para E1 como compatibilidade)
    const customPrices = (company?.customPrices as Record<string, number>) || {};
    let effectivePrice = product.defaultPrice;
    if (typeof customPrices[product.code] === 'number') {
      effectivePrice = Number(customPrices[product.code]);
    } else if (typeof customPrices[product.code.toUpperCase()] === 'number') {
      effectivePrice = Number(customPrices[product.code.toUpperCase()]);
    } else if (typeof customPrices[product.code.toLowerCase()] === 'number') {
      effectivePrice = Number(customPrices[product.code.toLowerCase()]);
    } else if (product.code === 'E1' && company?.customQueryPrice) {
      effectivePrice = Number(company.customQueryPrice);
    }

    eligibility = { allowed: true, price: effectivePrice };
  }

  try {
    const tipoParam = req.body?.tipo || req.query?.tipo || 'mae';

    // 4. Executar chamada com cascata de contingências transparentes e normalização pericial
    let result: { normalized: NormalizedResult; raw?: any };
    let custoInternoCalculado: number | undefined;

    if (product.code === 'E20') {
      const e20Data = await e20Service.executarConsultaE20(cleanQuery);
      const normalized = normalizeE20(e20Data, cleanQuery);
      result = { normalized, raw: e20Data };
      custoInternoCalculado = e20Data.custoInternoTotal;
    } else if (product.code === 'E24') {
      const e24Data = await e24Service.executarConsultaE24(cleanQuery);
      const normalized = normalizeE24(e24Data, cleanQuery);
      result = { normalized, raw: e24Data };
      (result as any).providerUsed = e24Data.fonteHistorico === 'BASE_INTERNA_RENACRED'
        ? 'base_interna_renacred'
        : 'historico_proprietario';
      custoInternoCalculado = e24Data.custoInternoTotal;
    } else {
      result = await fetchbrasilService.consultarProdutoComContingencia(product.code, cleanQuery, { tipo: tipoParam });
      const providerUsed = (result as any).providerUsed;
      if (providerUsed === 'base_interna_renacred' || result.raw?.api_central?.cache_interno) {
        custoInternoCalculado = 0;
      } else if (providerUsed === 'placa_serpro') {
        custoInternoCalculado = 0.07;
      } else {
        custoInternoCalculado = product.defaultCost;
      }
    }

    // Se o provedor upstream retornou falha, success: false ou erro explícito sem ser registro não encontrado
    if (
      result.raw &&
      !result.raw.isNotFound &&
      (result.raw.success === false ||
       result.raw.error === 'resolve_failed' ||
       result.raw.erro === 'resolve_failed' ||
       result.raw.error)
    ) {
      throw new Error('Estamos em manutenção, tente mais tarde');
    }

    const processingTimeMs = Date.now() - startTime;
    const totalRegistros = result.normalized.totalRegistros;
    const isNotFound = !!result.raw?.isNotFound;
    const providerUsedFinal = (result as any).providerUsed || product.apiPrimary;

    // Se a consulta não encontrou registros (veículo/pessoa inexistente ou sem ocorrências),
    // geramos uma Certidão Negativa / Laudo estruturado para não gravar `{}` ou `null`.
    const resultDataToSave = result.normalized.dados || {
      status: 'REGISTRO_NAO_ENCONTRADO',
      mensagem: isNotFound
        ? (result.raw?.mensagem || result.raw?.message || 'Não foi possível encontrar informações para este parâmetro nas bases oficiais de trânsito.')
        : 'Nenhum registro localizado nas bases oficiais de trânsito.',
      parametro_pesquisado: cleanQuery,
      total_registros: totalRegistros,
      laudo_pericial: 'Certidão Negativa: Registro inexistente ou sem ocorrências registradas nas bases oficiais de trânsito.',
      certidao_negativa: true,
      provedor_consultado: providerUsedFinal,
      consultado_em: new Date().toISOString()
    };

    // Regra Comercial Oficial Renacred: Consultas com retorno válido das bases oficiais são tarifadas,
    // inclusive certidões com "nada consta", 0 registros ou sem ocorrências (houve busca e processamento).
    // Isenção de cobrança (custo R$ 0,00) aplica-se exclusivamente a:
    // 1) Usuários Super Admin
    // 2) Empresa Matriz / Ilimitada Renacred
    const isMasterAdmin = isSuperAdmin ||
                          company?.cnpjCpf === '00000000000191' ||
                          company?.razaoSocial?.toLowerCase().includes('renacred') ||
                          Number(company?.creditLimit) >= 999999;
    const finalCost = isMasterAdmin ? 0 : eligibility.price;
    const hashAutenticacao = generatePericialHash(product.code, cleanQuery);

    // 5. Persistir auditoria da consulta no banco
    const queryRecord = await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanQuery,
        source: QuerySource.WEB,
        status: QueryStatus.COMPLETED,
        cost: finalCost,
        totalDeclaracoes: totalRegistros,
        processingTimeMs,
        requestData: {
          product: product.code,
          productName: product.name,
          category: product.category,
          query: cleanQuery,
          tipo: product.code === 'E18' ? tipoParam : undefined,
          hash: hashAutenticacao,
          providerUsed: providerUsedFinal,
          custoInterno: custoInternoCalculado,
          clientIp: networkInfo.ip,
          location: networkInfo.locationLabel,
          isInternalTest: networkInfo.isInternalTest
        },
        resultData: resultDataToSave as any
      }
    });

    // 6. Debitar saldo / registrar fatura somente se houver dados
    if (finalCost > 0) {
      await billingService.chargeQuery(companyId, queryRecord.id, finalCost);
    }

    // Sincronização em tempo real para a base interna InfoSinistros para qualquer produto veicular
    const isVeicular = product.category === 'veicular' ||
      ['E2', 'E12', 'E19', 'E20', 'E24', 'E4', 'E5', 'E8', 'E9', 'E10', 'E14', 'E23'].includes(product.code);
    if (isVeicular && totalRegistros > 0) {
      setImmediate(() => {
        syncVeicularToInfosinistros(cleanQuery, result, product.code).catch(e =>
          logger.error(`[SYNC INFOSINISTROS] Erro assíncrono ${product.code} Web: ${e.message}`)
        );
      });
    }

    const mensagemRetorno = isNotFound
      ? (result.raw?.mensagem || result.raw?.message || 'Registro não localizado nas bases oficiais.')
      : undefined;

    const responsePayload: any = {
      success: true,
      queryId: queryRecord.id,
      produto: {
        codigo: product.code,
        nome: product.name,
        categoria: product.category
      },
      parametro_pesquisado: cleanQuery,
      total_registros: totalRegistros,
      custo_debitado: finalCost,
      tempo_resposta_ms: processingTimeMs,
      hash_autenticacao: hashAutenticacao,
      provedor_utilizado: providerUsedFinal,
      consultado_em: new Date().toISOString(),
      ...(mensagemRetorno ? { mensagem: mensagemRetorno } : {}),
      dados: result.normalized.dados || resultDataToSave
    };

    // Para E23: expor blocos nativos de CNH/RENACH diretamente na raiz do payload (compatibilidade 1:1)
    if (product.code === 'E23') {
      const rawApi = result.normalized.dados?._rawApi || result.raw;
      if (rawApi && typeof rawApi === 'object') {
        const { api_central, token, provedor, fornecedor, ...cleanFlat } = rawApi;
        Object.assign(responsePayload, cleanFlat);
      }
    }

    // Para E22: expor 'condutor' diretamente na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E22') {
      const cond = result.normalized.dados?.condutor || result.raw?.condutor;
      if (cond) {
        responsePayload.condutor = cond;
      }
    }

    // Para E21: expor chaves nativas do SERPRO diretamente na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E21') {
      const rawApi = result.normalized.dados?._rawApi || result.raw;
      if (rawApi && typeof rawApi === 'object') {
        const { api_central, token, provedor, fornecedor, ...cleanFlat } = rawApi;
        Object.assign(responsePayload, cleanFlat);
      }
    }

    // Para E14: expor chaves nativas do SNG na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E14') {
      const rawE14 = result.raw;
      if (rawE14 && typeof rawE14 === 'object' && !rawE14.isNotFound) {
        if (rawE14.chassi && !responsePayload.chassi) responsePayload.chassi = rawE14.chassi;
        if (rawE14.veiculo && !responsePayload.veiculo) responsePayload.veiculo = rawE14.veiculo;
        if (rawE14.gravames && !responsePayload.gravames) responsePayload.gravames = rawE14.gravames;
        if (rawE14.qtd_gravames !== undefined && responsePayload.qtd_gravames === undefined) responsePayload.qtd_gravames = rawE14.qtd_gravames;
        if (rawE14.remarcacao && !responsePayload.remarcacao) responsePayload.remarcacao = rawE14.remarcacao;
        if (rawE14.remarcacao_descricao && !responsePayload.remarcacao_descricao) responsePayload.remarcacao_descricao = rawE14.remarcacao_descricao;
      }
    }

    if (mensagemRetorno) {
      responsePayload.mensagem = mensagemRetorno;
    }

    // Armazenar no cache de deduplicação por 10 segundos
    recentQueriesDedupCache.set(dedupKey, {
      timestamp: Date.now(),
      responsePayload,
      queryId: queryRecord.id
    });

    return res.json(responsePayload);
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    logger.error(`[CONSULTA] Erro ao executar produto ${product.code} para ${cleanQuery}: ${error.message}`);

    await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanQuery,
        source: QuerySource.WEB,
        status: QueryStatus.ERROR,
        cost: 0,
        totalDeclaracoes: 0,
        processingTimeMs,
        requestData: {
          product: product.code,
          productName: product.name,
          query: cleanQuery,
          clientIp: networkInfo.ip,
          location: networkInfo.locationLabel,
          isInternalTest: networkInfo.isInternalTest
        },
        errorData: { message: error.message }
      }
    });

    const isMaintenance = /manuten|service unavailable|503|timeout|econnaborted|etimedout|falha na consulta oficial/i.test(error.message || '');
    const cleanMessage = isMaintenance || !error.message
      ? 'Estamos em manutenção, tente mais tarde'
      : (error.message.includes('Estamos em manutenção') ? error.message : 'Estamos em manutenção, tente mais tarde');

    return res.status(503).json({
      success: false,
      message: cleanMessage
    });
  }
};

/**
 * Endpoint Público para a API de Desenvolvedores (Autenticação via x-api-key ou Bearer)
 * GET/POST /v1/:codigo
 */
export const executarConsultaApiV1 = async (req: any, res: Response) => {
  const startTime = Date.now();
  const networkInfo = getClientNetworkInfo(req);
  const productIdentifier = req.params.codigo || req.query.api || req.body?.api;

  if (!productIdentifier) {
    return res.status(400).json({
      success: false,
      message: 'Código do produto ou parâmetro de serviço é obrigatório.'
    });
  }

  const product = findServerProduct(productIdentifier);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Produto '${productIdentifier}' não localizado no catálogo oficial da Renacred.`
    });
  }

  const queryParam = req.query.query || req.query.documento || req.query.placa || req.query.cpf || req.query.rg || req.query.nome ||
                     req.body?.query || req.body?.documento || req.body?.placa || req.body?.cpf || req.body?.rg || req.body?.nome;

  const validation = validateProductInput(product.inputType, queryParam);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }

  const cleanQuery = validation.cleaned;
  const company = req.company;
  const apiKey = req.apiKey;
  const isSuperAdmin = !!company?.isSuperAdmin;

  // 1. Checar se produto está contratado pela empresa ou autorizado na chave de API
  let eligibility: BillingCheckResult = { allowed: true, price: product.defaultPrice };
  if (!isSuperAdmin) {
    const companyAllowed: string[] = company?.allowedProducts || ['ALL'];
    const keyAllowed: string[] = apiKey?.allowedProducts || ['ALL'];

    const allowedByCompany = companyAllowed.includes('ALL') || companyAllowed.some(p => p.toUpperCase() === product.code.toUpperCase());
    const allowedByKey = keyAllowed.includes('ALL') || keyAllowed.some(p => p.toUpperCase() === product.code.toUpperCase());

    if (!allowedByCompany || !allowedByKey) {
      return res.status(403).json({
        type: 'https://renacred.com.br/errors/product-not-allowed',
        title: 'Produto Não Contratado',
        status: 403,
        detail: `A sua organização ou chave de API não possui permissão para consumir o produto ${product.code} (${product.name}). Entre em contato com seu gestor para liberação.`,
        code: 'PRODUCT_NOT_ALLOWED'
      });
    }

    const check = await billingService.checkEligibility(company.id, company, product.code);
    if (!check.allowed) {
      return res.status(402).json({
        success: false,
        code: check.code,
        message: check.message
      });
    }

    const customPrices = (company?.customPrices as Record<string, number>) || {};
    let effectivePrice = product.defaultPrice;
    if (typeof customPrices[product.code] === 'number') {
      effectivePrice = Number(customPrices[product.code]);
    } else if (typeof customPrices[product.code.toUpperCase()] === 'number') {
      effectivePrice = Number(customPrices[product.code.toUpperCase()]);
    } else if (typeof customPrices[product.code.toLowerCase()] === 'number') {
      effectivePrice = Number(customPrices[product.code.toLowerCase()]);
    } else if (product.code === 'E1' && company?.customQueryPrice) {
      effectivePrice = Number(company.customQueryPrice);
    }

    eligibility = { allowed: true, price: effectivePrice };
  }

  // 2. Proteção contra chamadas duplicadas simultâneas (rajadas / workers concorrentes da API)
  const dedupKey = `${company.id}_${product.code}_${cleanQuery}`;
  const now = Date.now();
  const cached = recentQueriesDedupCache.get(dedupKey);

  // Se a mesma empresa consultou exatamente o mesmo produto e identificador há menos de 10 segundos:
  if (cached && (now - cached.timestamp < 10000)) {
    const processingTimeMs = Date.now() - startTime;
    logger.info(`[DEDUP] Chamada duplicada detectada para empresa ${company.razaoSocial} (${cleanQuery} / ${product.code}) em menos de 10s. Retornando cache sem nova cobrança.`);

    const dupRecord = await prisma.query.create({
      data: {
        companyId: company.id,
        identifier: cleanQuery,
        source: QuerySource.API,
        status: QueryStatus.COMPLETED,
        cost: 0,
        totalDeclaracoes: cached.responsePayload.total_registros || 0,
        processingTimeMs,
        requestData: {
          product: product.code,
          productName: product.name,
          category: product.category,
          query: cleanQuery,
          apiKeyId: apiKey?.id,
          clientIp: networkInfo.ip,
          isDuplicate: true,
          originalQueryId: cached.queryId,
          duplicateNotice: 'Consulta duplicada em menos de 10 segundos - Cobrança isenta'
        },
        resultData: cached.responsePayload.dados
      }
    });

    setImmediate(async () => {
      try {
        await prisma.apiLog.create({
          data: {
            companyId: company.id,
            apiKeyId: apiKey?.id,
            endpoint: `/v1/${product.code.toLowerCase()}`,
            method: req.method,
            statusCode: 200,
            responseTimeMs: processingTimeMs,
            creditsUsed: 0,
            ipAddress: networkInfo.ip
          }
        });
      } catch {}
    });

    return res.json({
      ...cached.responsePayload,
      queryId: dupRecord.id,
      custo_debitado: 0,
      is_duplicada: true,
      mensagem: 'Consulta duplicada recebida em menos de 10 segundos. Dados retornados com sucesso sem tarifação adicional.'
    });
  }

  try {
    const tipoParam = req.query.tipo || req.body?.tipo || 'mae';
    let result: { normalized: NormalizedResult; raw?: any };
    let custoInternoCalculado: number | undefined;

    if (product.code === 'E20') {
      const e20Data = await e20Service.executarConsultaE20(cleanQuery);
      const normalized = normalizeE20(e20Data, cleanQuery);
      result = { normalized, raw: e20Data };
      custoInternoCalculado = e20Data.custoInternoTotal;
    } else if (product.code === 'E24') {
      const e24Data = await e24Service.executarConsultaE24(cleanQuery);
      const normalized = normalizeE24(e24Data, cleanQuery);
      result = { normalized, raw: e24Data };
      (result as any).providerUsed = e24Data.fonteHistorico === 'BASE_INTERNA_RENACRED'
        ? 'base_interna_renacred'
        : 'historico_proprietario';
      custoInternoCalculado = e24Data.custoInternoTotal;
    } else {
      result = await fetchbrasilService.consultarProdutoComContingencia(product.code, cleanQuery, { tipo: tipoParam });
      const providerUsed = (result as any).providerUsed;
      if (providerUsed === 'base_interna_renacred' || result.raw?.api_central?.cache_interno) {
        custoInternoCalculado = 0;
      } else if (providerUsed === 'placa_serpro') {
        custoInternoCalculado = 0.07;
      } else {
        custoInternoCalculado = product.defaultCost;
      }
    }

    // Se o provedor upstream retornou falha, success: false ou erro explícito sem ser registro não encontrado
    if (
      result.raw &&
      !result.raw.isNotFound &&
      (result.raw.success === false ||
       result.raw.error === 'resolve_failed' ||
       result.raw.erro === 'resolve_failed' ||
       result.raw.error)
    ) {
      throw new Error('Estamos em manutenção, tente mais tarde');
    }

    const processingTimeMs = Date.now() - startTime;
    const totalRegistros = result.normalized.totalRegistros;
    const isNotFound = !!result.raw?.isNotFound;
    const providerUsedFinal = (result as any).providerUsed || product.apiPrimary;

    // Se a consulta não encontrou registros (veículo/pessoa inexistente ou sem ocorrências),
    // geramos uma Certidão Negativa / Laudo estruturado para não gravar `{}` ou `null`.
    const resultDataToSave = result.normalized.dados || {
      status: 'REGISTRO_NAO_ENCONTRADO',
      mensagem: isNotFound
        ? (result.raw?.mensagem || result.raw?.message || 'Não foi possível encontrar informações para este parâmetro nas bases oficiais de trânsito.')
        : 'Nenhum registro localizado nas bases oficiais de trânsito.',
      parametro_pesquisado: cleanQuery,
      total_registros: totalRegistros,
      laudo_pericial: 'Certidão Negativa: Registro inexistente ou sem ocorrências registradas nas bases oficiais de trânsito.',
      certidao_negativa: true,
      provedor_consultado: providerUsedFinal,
      consultado_em: new Date().toISOString()
    };

    // Regra Comercial Oficial Renacred: Consultas com retorno válido das bases oficiais são tarifadas,
    // inclusive certidões com "nada consta", 0 registros ou sem ocorrências (houve busca e processamento).
    // Isenção de cobrança (custo R$ 0,00) aplica-se exclusivamente a:
    // 1) Usuários Super Admin
    // 2) Empresa Matriz / Ilimitada Renacred
    const isMasterAdmin = isSuperAdmin ||
                          company?.cnpjCpf === '00000000000191' ||
                          company?.razaoSocial?.toLowerCase().includes('renacred') ||
                          Number(company?.creditLimit) >= 999999;
    const finalCost = isMasterAdmin ? 0 : eligibility.price;
    const hashAutenticacao = generatePericialHash(product.code, cleanQuery);

    // Gravar consulta no banco
    const queryRecord = await prisma.query.create({
      data: {
        companyId: company.id,
        identifier: cleanQuery,
        source: QuerySource.API,
        status: QueryStatus.COMPLETED,
        cost: finalCost,
        totalDeclaracoes: totalRegistros,
        processingTimeMs,
        requestData: {
          product: product.code,
          productName: product.name,
          category: product.category,
          query: cleanQuery,
          tipo: product.code === 'E18' ? tipoParam : undefined,
          apiKeyId: apiKey?.id,
          hash: hashAutenticacao,
          providerUsed: providerUsedFinal,
          custoInterno: custoInternoCalculado,
          clientIp: networkInfo.ip,
          location: networkInfo.locationLabel,
          isInternalTest: networkInfo.isInternalTest
        },
        resultData: resultDataToSave as any
      }
    });

    // Debitar créditos se houver cobrança
    if (finalCost > 0) {
      await billingService.chargeQuery(company.id, queryRecord.id, finalCost);
    }

    // Sincronização em tempo real para a base interna InfoSinistros para qualquer produto veicular
    const isVeicular = product.category === 'veicular' ||
      ['E2', 'E12', 'E19', 'E20', 'E24', 'E4', 'E5', 'E8', 'E9', 'E10', 'E14', 'E23'].includes(product.code);
    if (isVeicular && totalRegistros > 0) {
      setImmediate(() => {
        syncVeicularToInfosinistros(cleanQuery, result, product.code).catch(e =>
          logger.error(`[SYNC INFOSINISTROS] Erro assíncrono ${product.code} API: ${e.message}`)
        );
      });
    }

    // Gravação assíncrona do log de API (sem bloquear o retorno)
    setImmediate(async () => {
      try {
        await prisma.apiLog.create({
          data: {
            companyId: company.id,
            apiKeyId: apiKey?.id,
            endpoint: `/v1/${product.code.toLowerCase()}`,
            method: req.method,
            statusCode: 200,
            responseTimeMs: processingTimeMs,
            creditsUsed: finalCost,
            ipAddress: networkInfo.ip
          }
        });
      } catch (logErr: any) {
        logger.error(`[API_LOG] Falha ao registrar log de API: ${logErr.message}`);
      }
    });

    const mensagemRetorno = isNotFound
      ? (result.raw?.mensagem || result.raw?.message || 'Registro não localizado nas bases oficiais.')
      : undefined;

    const responsePayload: any = {
      success: true,
      queryId: queryRecord.id,
      produto: {
        codigo: product.code,
        nome: product.name,
        categoria: product.category
      },
      parametro_pesquisado: cleanQuery,
      total_registros: totalRegistros,
      custo_debitado: finalCost,
      tempo_resposta_ms: processingTimeMs,
      hash_autenticacao: hashAutenticacao,
      provedor_utilizado: providerUsedFinal,
      consultado_em: new Date().toISOString(),
      ...(mensagemRetorno ? { mensagem: mensagemRetorno } : {}),
      dados: result.normalized.dados || resultDataToSave
    };

    // Para E23: expor blocos nativos de CNH/RENACH diretamente na raiz do payload (compatibilidade 1:1)
    if (product.code === 'E23') {
      const rawApi = result.normalized.dados?._rawApi || result.raw;
      if (rawApi && typeof rawApi === 'object') {
        const { api_central, token, provedor, fornecedor, ...cleanFlat } = rawApi;
        Object.assign(responsePayload, cleanFlat);
      }
    }

    // Para E22: expor 'condutor' diretamente na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E22') {
      const cond = result.normalized.dados?.condutor || result.raw?.condutor;
      if (cond) {
        responsePayload.condutor = cond;
      }
    }

    // Para E21: expor chaves nativas do SERPRO diretamente na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E21') {
      const rawApi = result.normalized.dados?._rawApi || result.raw;
      if (rawApi && typeof rawApi === 'object') {
        const { api_central, token, provedor, fornecedor, ...cleanFlat } = rawApi;
        Object.assign(responsePayload, cleanFlat);
      }
    }

    // Para E14: expor chaves nativas do SNG na raiz do payload (compatibilidade 1:1 FetchBrasil)
    if (product.code === 'E14') {
      const rawE14 = result.raw;
      if (rawE14 && typeof rawE14 === 'object' && !rawE14.isNotFound) {
        if (rawE14.chassi && !responsePayload.chassi) responsePayload.chassi = rawE14.chassi;
        if (rawE14.veiculo && !responsePayload.veiculo) responsePayload.veiculo = rawE14.veiculo;
        if (rawE14.gravames && !responsePayload.gravames) responsePayload.gravames = rawE14.gravames;
        if (rawE14.qtd_gravames !== undefined && responsePayload.qtd_gravames === undefined) responsePayload.qtd_gravames = rawE14.qtd_gravames;
        if (rawE14.remarcacao && !responsePayload.remarcacao) responsePayload.remarcacao = rawE14.remarcacao;
        if (rawE14.remarcacao_descricao && !responsePayload.remarcacao_descricao) responsePayload.remarcacao_descricao = rawE14.remarcacao_descricao;
      }
    }

    if (mensagemRetorno) {
      responsePayload.mensagem = mensagemRetorno;
    }

    // Armazenar no cache de deduplicação por 10 segundos
    recentQueriesDedupCache.set(dedupKey, {
      timestamp: Date.now(),
      responsePayload,
      queryId: queryRecord.id
    });

    return res.json(responsePayload);
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    logger.error(`[API_V1] Erro ao consultar ${product.code} para ${cleanQuery}: ${error.message}`);

    // Persistir auditoria de falha técnica no extrato da empresa (status ERROR, custo R$ 0,00)
    try {
      await prisma.query.create({
        data: {
          companyId: company.id,
          identifier: cleanQuery,
          source: QuerySource.API,
          status: QueryStatus.ERROR,
          cost: 0,
          totalDeclaracoes: 0,
          processingTimeMs,
          requestData: {
            product: product.code,
            productName: product.name,
            category: product.category,
            query: cleanQuery,
            apiKeyId: apiKey?.id,
            clientIp: networkInfo.ip,
            location: networkInfo.locationLabel,
            isInternalTest: networkInfo.isInternalTest
          },
          errorData: { message: error.message }
        }
      });
    } catch (e: any) {
      logger.error(`[API_V1] Falha ao gravar Query de erro: ${e.message}`);
    }

    setImmediate(async () => {
      try {
        await prisma.apiLog.create({
          data: {
            companyId: company.id,
            apiKeyId: apiKey?.id,
            endpoint: `/v1/${product.code.toLowerCase()}`,
            method: req.method,
            statusCode: 500,
            responseTimeMs: processingTimeMs,
            creditsUsed: 0,
            ipAddress: networkInfo.ip
          }
        });
      } catch {}
    });

    const isMaintenance = /manuten|service unavailable|503|timeout|econnaborted|etimedout|falha na consulta oficial/i.test(error.message || '');
    const cleanMessage = isMaintenance || !error.message
      ? 'Estamos em manutenção, tente mais tarde'
      : (error.message.includes('Estamos em manutenção') ? error.message : 'Estamos em manutenção, tente mais tarde');

    return res.status(503).json({
      success: false,
      message: cleanMessage
    });
  }
};
