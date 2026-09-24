import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { billingService, BillingCheckResult } from '../services/billing.service';
import { findServerProduct, ServerProductConfig } from '../config/productsCatalog';
import { validateIdentifier, sanitizeCpfCnpj } from '../utils/cpfCnpjValidator';
import { validatePlaca } from './veicularController';
import { logger } from '../utils/logger';
import { QuerySource, QueryStatus } from '../types/database';

/**
 * Validador genérico por tipo de input configurado no produto
 */
export function validateProductInput(
  inputType: 'cpf_cnpj' | 'cpf' | 'placa' | 'rg',
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
    case 'rg': {
      const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleaned.length < 3 || cleaned.length > 20) {
        return { valid: false, cleaned: '', error: 'Número do RG deve conter entre 3 e 20 caracteres.' };
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
  const queryParam = req.body?.query || req.body?.parametro || req.body?.documento || req.body?.placa || req.body?.cpf || req.body?.rg;
  const validation = validateProductInput(product.inputType, queryParam);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error
    });
  }

  const cleanQuery = validation.cleaned;

  // 3. Checagem de elegibilidade e faturamento
  let eligibility: BillingCheckResult = { allowed: true, price: product.defaultPrice };
  if (!isSuperAdmin) {
    const check = await billingService.checkEligibility(companyId, req.user?.company);
    if (!check.allowed) {
      return res.status(402).json({
        success: false,
        code: check.code,
        message: check.message
      });
    }
    // Preço efetivo da consulta: usa o customQueryPrice da empresa ou o defaultPrice do produto
    const effectivePrice = req.user?.company?.customQueryPrice
      ? Number(req.user.company.customQueryPrice)
      : product.defaultPrice;
    eligibility = { allowed: true, price: effectivePrice };
  }

  try {
    // 4. Executar chamada com cascata de contingências transparentes e normalização pericial
    const result = await fetchbrasilService.consultarProdutoComContingencia(product.code, cleanQuery);
    const processingTimeMs = Date.now() - startTime;
    const totalRegistros = result.normalized.totalRegistros;
    const hasData = totalRegistros > 0 && result.normalized.dados !== null;

    // Regra Crítica: Consulta sem dados = Custo Zero (R$ 0,00)
    const finalCost = (!isSuperAdmin && hasData) ? eligibility.price : 0;
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
          hash: hashAutenticacao
        },
        resultData: result.normalized.dados as any
      }
    });

    // 6. Debitar saldo / registrar fatura somente se houver dados
    if (finalCost > 0) {
      await billingService.chargeQuery(companyId, queryRecord.id, finalCost);
    }

    return res.json({
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
      consultado_em: new Date().toISOString(),
      dados: result.normalized.dados
    });
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
          query: cleanQuery
        },
        errorData: { message: error.message }
      }
    });

    return res.status(500).json({
      success: false,
      message: `Não foi possível obter dados junto às bases oficiais: ${error.message}`
    });
  }
};

/**
 * Endpoint Público para a API de Desenvolvedores (Autenticação via x-api-key ou Bearer)
 * GET/POST /v1/:codigo
 */
export const executarConsultaApiV1 = async (req: any, res: Response) => {
  const startTime = Date.now();
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

  const queryParam = req.query.query || req.query.documento || req.query.placa || req.query.cpf || req.query.rg ||
                     req.body?.query || req.body?.documento || req.body?.placa || req.body?.cpf || req.body?.rg;

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

  // 1. Checar saldo / faturamento da empresa da chave
  let eligibility: BillingCheckResult = { allowed: true, price: product.defaultPrice };
  if (!isSuperAdmin) {
    const check = await billingService.checkEligibility(company.id, company);
    if (!check.allowed) {
      return res.status(402).json({
        success: false,
        code: check.code,
        message: check.message
      });
    }
    const effectivePrice = company?.customQueryPrice
      ? Number(company.customQueryPrice)
      : product.defaultPrice;
    eligibility = { allowed: true, price: effectivePrice };
  }

  try {
    const result = await fetchbrasilService.consultarProdutoComContingencia(product.code, cleanQuery);
    const processingTimeMs = Date.now() - startTime;
    const totalRegistros = result.normalized.totalRegistros;
    const hasData = totalRegistros > 0 && result.normalized.dados !== null;
    const finalCost = (!isSuperAdmin && hasData) ? eligibility.price : 0;
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
          apiKeyId: apiKey?.id,
          hash: hashAutenticacao
        },
        resultData: result.normalized.dados as any
      }
    });

    // Debitar créditos se houver dados
    if (finalCost > 0) {
      await billingService.chargeQuery(company.id, queryRecord.id, finalCost);
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
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null
          }
        });
      } catch (logErr: any) {
        logger.error(`[API_LOG] Falha ao registrar log de API: ${logErr.message}`);
      }
    });

    return res.json({
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
      consultado_em: new Date().toISOString(),
      dados: result.normalized.dados
    });
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    logger.error(`[API_V1] Erro ao consultar ${product.code} para ${cleanQuery}: ${error.message}`);

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
            ipAddress: req.ip || req.headers['x-forwarded-for'] || null
          }
        });
      } catch {}
    });

    return res.status(500).json({
      success: false,
      message: `Erro na consulta junto às bases oficiais: ${error.message}`
    });
  }
};
