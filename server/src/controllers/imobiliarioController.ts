import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { billingService } from '../services/billing.service';
import { validateIdentifier } from '../utils/cpfCnpjValidator';
import { logger } from '../utils/logger';
import { QuerySource, QueryStatus } from '../types/database';

/**
 * Consulta de Histórico Imobiliário via Painel Web (JWT)
 */
export const consultarWeb = async (req: any, res: Response) => {
  const startTime = Date.now();
  const companyId = req.user.companyId;
  const userId = req.user.id;
  const { documento } = req.body;

  if (!documento) {
    return res.status(400).json({ success: false, message: 'Documento (CPF ou CNPJ) é obrigatório.' });
  }

  const validation = validateIdentifier(documento);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: 'Documento (CPF ou CNPJ) informado é inválido.' });
  }

  const cleanDoc = validation.cleaned;

  // 1. Validar elegibilidade de faturamento (Saldo pré-pago ou Limite pós-pago)
  const eligibility = await billingService.checkEligibility(companyId);
  if (!eligibility.allowed) {
    return res.status(402).json({
      success: false,
      code: eligibility.code,
      message: eligibility.message,
    });
  }

  try {
    // 2. Chamar a API FetchBrasil (em tempo real, sem cache)
    const result = await fetchbrasilService.consultarHistoricoImobiliario(cleanDoc);
    const processingTimeMs = Date.now() - startTime;

    // 3. Registrar a consulta no banco de dados
    const queryRecord = await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanDoc,
        source: QuerySource.WEB,
        status: QueryStatus.COMPLETED,
        cost: eligibility.price,
        totalDeclaracoes: result.total_declaracoes || (result.declaracoes ? result.declaracoes.length : 0),
        processingTimeMs,
        resultData: result as any,
      }
    });

    // 4. Executar a cobrança / débito financeiro
    await billingService.chargeQuery(companyId, queryRecord.id, eligibility.price);

    return res.json({
      success: true,
      queryId: queryRecord.id,
      data: result,
      custoDebitado: eligibility.price,
      tempoProcessamentoMs: processingTimeMs,
    });
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    logger.error(`[IMOBILIARIO WEB] Erro na consulta do documento ${cleanDoc}: ${error.message}`);

    await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanDoc,
        source: QuerySource.WEB,
        status: QueryStatus.ERROR,
        cost: 0,
        processingTimeMs,
        errorData: { message: error.message },
      }
    });

    const isProviderBlocked = error.message && error.message.includes('403');
    const userMessage = isProviderBlocked
      ? 'O provedor de dados cartorários (FetchBrasil) bloqueou o acesso deste servidor (HTTP 403 Cloudflare). Verifique a liberação do IP 209.50.245.165 no painel da FetchBrasil.'
      : (error.message || 'Erro ao processar consulta de histórico imobiliário.');

    return res.status(isProviderBlocked ? 502 : 500).json({
      success: false,
      code: isProviderBlocked ? 'PROVIDER_BLOCKED_403' : 'QUERY_ERROR',
      message: userMessage,
    });
  }
};

/**
 * Consulta de Histórico Imobiliário via API Externa REST (POST /v1/imobiliario/historico)
 */
export const consultarApiV1 = async (req: any, res: Response) => {
  const startTime = Date.now();
  const company = req.company;
  const apiKey = req.apiKey;
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || '';

  const { query, documento } = req.body;
  const targetDoc = query || documento || req.query.query;

  if (!targetDoc) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_DOCUMENT',
      message: 'Parâmetro query (CPF ou CNPJ) é obrigatório.',
    });
  }

  const validation = validateIdentifier(targetDoc);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DOCUMENT',
      message: 'O CPF ou CNPJ fornecido não possui formato válido.',
    });
  }

  const cleanDoc = validation.cleaned;

  // 1. Checar elegibilidade de faturamento
  const eligibility = await billingService.checkEligibility(company.id);
  if (!eligibility.allowed) {
    await prisma.apiLog.create({
      data: {
        apiKeyId: apiKey.id,
        companyId: company.id,
        endpoint: '/v1/imobiliario/historico',
        method: 'POST',
        statusCode: 402,
        responseTimeMs: Date.now() - startTime,
        ipAddress: clientIp,
      }
    });

    return res.status(402).json({
      success: false,
      code: eligibility.code,
      message: eligibility.message,
    });
  }

  try {
    // 2. Chamar FetchBrasil em tempo real
    const result = await fetchbrasilService.consultarHistoricoImobiliario(cleanDoc);
    const responseTimeMs = Date.now() - startTime;

    // 3. Salvar registro da Query
    const queryRecord = await prisma.query.create({
      data: {
        companyId: company.id,
        identifier: cleanDoc,
        source: QuerySource.API,
        status: QueryStatus.COMPLETED,
        cost: eligibility.price,
        totalDeclaracoes: result.total_declaracoes || (result.declaracoes ? result.declaracoes.length : 0),
        processingTimeMs: responseTimeMs,
        resultData: result as any,
      }
    });

    // 4. Efetuar cobrança
    await billingService.chargeQuery(company.id, queryRecord.id, eligibility.price);

    // 5. Salvar Log da API
    await prisma.apiLog.create({
      data: {
        apiKeyId: apiKey.id,
        companyId: company.id,
        endpoint: '/v1/imobiliario/historico',
        method: 'POST',
        statusCode: 200,
        responseTimeMs,
        ipAddress: clientIp,
        creditsUsed: eligibility.price,
      }
    });

    return res.status(200).json({
      periodo: result.periodo,
      total_declaracoes: result.total_declaracoes,
      declaracoes: result.declaracoes,
      api_central: {
        api_utilizada: 'historico_imobiliario',
        parametro_utilizado: 'query',
        query_fornecida: cleanDoc,
        timestamp: new Date().toISOString(),
        tempo_resposta_ms: responseTimeMs,
      }
    });
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    logger.error(`[API V1] Erro na requisição para documento ${cleanDoc}: ${error.message}`);

    await prisma.apiLog.create({
      data: {
        apiKeyId: apiKey.id,
        companyId: company.id,
        endpoint: '/v1/imobiliario/historico',
        method: 'POST',
        statusCode: 500,
        responseTimeMs,
        ipAddress: clientIp,
      }
    });

    return res.status(500).json({
      success: false,
      code: 'EXTERNAL_PROVIDER_ERROR',
      message: error.message || 'Erro ao processar consulta de histórico imobiliário no provedor.',
    });
  }
};

/**
 * Listar histórico de consultas da empresa logada
 */
export const listarHistoricoConsultas = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [queries, total] = await Promise.all([
      prisma.query.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          identifier: true,
          source: true,
          status: true,
          cost: true,
          totalDeclaracoes: true,
          processingTimeMs: true,
          createdAt: true,
        }
      }),
      prisma.query.count({ where: { companyId } })
    ]);

    return res.json({
      success: true,
      data: queries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao listar histórico de consultas.' });
  }
};

/**
 * Obter detalhes completos de uma consulta já realizada
 */
export const obterDetalhesConsulta = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const query = await prisma.query.findFirst({
      where: { id, companyId }
    });

    if (!query) {
      return res.status(404).json({ success: false, message: 'Consulta não encontrada.' });
    }

    return res.json({ success: true, data: query });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da consulta.' });
  }
};
