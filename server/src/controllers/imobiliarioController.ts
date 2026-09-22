import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { billingService, BillingCheckResult } from '../services/billing.service';
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
  const isSuperAdmin = !!req.user?.isSuperAdmin;
  let eligibility: BillingCheckResult = { allowed: true, price: 0 };

  if (!isSuperAdmin) {
    const check = await billingService.checkEligibility(companyId);
    if (!check.allowed) {
      return res.status(402).json({
        success: false,
        code: check.code,
        message: check.message,
      });
    }
    eligibility = check;
  }

  try {
    // 2. Chamar a API FetchBrasil (em tempo real, sem cache)
    const result = await fetchbrasilService.consultarHistoricoImobiliario(cleanDoc);
    const processingTimeMs = Date.now() - startTime;

    const totalDeclaracoes = result.total_declaracoes || (result.declaracoes ? result.declaracoes.length : 0);
    const hasData = totalDeclaracoes > 0 && Array.isArray(result.declaracoes) && result.declaracoes.length > 0;
    const finalCost = (!isSuperAdmin && hasData) ? eligibility.price : 0;

    // 3. Registrar a consulta no banco de dados
    const queryRecord = await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanDoc,
        source: QuerySource.WEB,
        status: QueryStatus.COMPLETED,
        cost: finalCost,
        totalDeclaracoes,
        processingTimeMs,
        resultData: result as any,
      }
    });

    // 4. Executar a cobrança / débito financeiro apenas quando houver dados e para clientes regulares
    if (finalCost > 0) {
      await billingService.chargeQuery(companyId, queryRecord.id, finalCost);
    }

    return res.json({
      success: true,
      queryId: queryRecord.id,
      data: result,
      custoDebitado: finalCost,
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
    const isSuperAdmin = req.user?.role === 'SUPERADMIN';
    const userMessage = isProviderBlocked
      ? (isSuperAdmin
          ? 'O provedor de dados cartorários bloqueou o acesso deste servidor (HTTP 403 Cloudflare). Verifique a liberação do IP 209.50.245.165.'
          : 'Serviço de consulta temporariamente indisponível no momento. Tente novamente em alguns instantes.')
      : (isSuperAdmin
          ? (error.message || 'Erro ao processar consulta de histórico imobiliário.')
          : 'Erro ao processar consulta de histórico imobiliário. Tente novamente em alguns instantes.');

    return res.status(500).json({
      success: false,
      code: isProviderBlocked ? 'PROVIDER_BLOCKED_403' : 'QUERY_ERROR',
      message: userMessage,
    });
  }
};

/**
 * Consulta de Histórico Imobiliário via API Externa REST (POST / GET /v1/imobiliario/historico)
 * Compatível 100% com chamadas diretas no formato:
 * https://api.renacred.com.br/v1/imobiliario/historico?token={TOKEN}&query={DOCUMENTO}
 */
export const consultarApiV1 = async (req: any, res: Response) => {
  const startTime = Date.now();
  const company = req.company;
  const apiKey = req.apiKey;
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || '';

  const targetDoc =
    req.query.query ||
    req.query.documento ||
    req.query.cpf ||
    req.query.cnpj ||
    req.body?.query ||
    req.body?.documento ||
    req.body?.cpf ||
    req.body?.cnpj;

  if (!targetDoc) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_DOCUMENT',
      message: 'Parâmetro query (CPF ou CNPJ) é obrigatório. Exemplo: ?query=12345678900 ou no corpo da requisição.',
    });
  }

  const validation = validateIdentifier(String(targetDoc));
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DOCUMENT',
      message: 'O CPF ou CNPJ fornecido não possui formato numérico válido.',
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
        endpoint: req.originalUrl || '/v1/imobiliario/historico',
        method: req.method,
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
    const totalDeclaracoes = result.total_declaracoes || (Array.isArray(result.declaracoes) ? result.declaracoes.length : 0);
    const hasData = totalDeclaracoes > 0 && Array.isArray(result.declaracoes) && result.declaracoes.length > 0;

    // 3. Regra de Negócio: Se NÃO houver dados, CUSTO ZERO (Não debitar do cliente)
    if (!hasData) {
      const queryRecord = await prisma.query.create({
        data: {
          companyId: company.id,
          identifier: cleanDoc,
          source: QuerySource.API,
          status: QueryStatus.COMPLETED,
          cost: 0, // Não tarifado
          totalDeclaracoes: 0,
          processingTimeMs: responseTimeMs,
          resultData: result as any,
        }
      });

      await prisma.apiLog.create({
        data: {
          apiKeyId: apiKey.id,
          companyId: company.id,
          endpoint: req.originalUrl || '/v1/imobiliario/historico',
          method: req.method,
          statusCode: 200,
          responseTimeMs,
          ipAddress: clientIp,
          creditsUsed: 0,
        }
      });

      return res.status(200).json({
        success: true,
        periodo: result.periodo || '',
        total_declaracoes: 0,
        declaracoes: [],
        mensagem: 'Nenhum histórico imobiliário ou declaração cartorária encontrada para este documento.',
        custo_debitado: 0.00,
        api_central: {
          api_utilizada: 'historico_imobiliario',
          parametro_utilizado: 'query',
          query_fornecida: cleanDoc,
          timestamp: new Date().toISOString(),
          tempo_resposta_ms: responseTimeMs,
        }
      });
    }

    // 4. Caso TENHA DADOS: Efetuar cobrança e registrar query tarifada
    const queryCost = eligibility.price;
    const queryRecord = await prisma.query.create({
      data: {
        companyId: company.id,
        identifier: cleanDoc,
        source: QuerySource.API,
        status: QueryStatus.COMPLETED,
        cost: queryCost,
        totalDeclaracoes,
        processingTimeMs: responseTimeMs,
        resultData: result as any,
      }
    });

    await billingService.chargeQuery(company.id, queryRecord.id, queryCost);

    await prisma.apiLog.create({
      data: {
        apiKeyId: apiKey.id,
        companyId: company.id,
        endpoint: req.originalUrl || '/v1/imobiliario/historico',
        method: req.method,
        statusCode: 200,
        responseTimeMs,
        ipAddress: clientIp,
        creditsUsed: queryCost,
      }
    });

    return res.status(200).json({
      success: true,
      periodo: result.periodo,
      total_declaracoes: totalDeclaracoes,
      declaracoes: result.declaracoes,
      custo_debitado: queryCost,
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
        endpoint: req.originalUrl || '/v1/imobiliario/historico',
        method: req.method,
        statusCode: 500,
        responseTimeMs,
        ipAddress: clientIp,
      }
    });

    return res.status(500).json({
      success: false,
      code: 'QUERY_ERROR',
      message: 'Não foi possível processar a consulta de histórico imobiliário no momento. Tente novamente em instantes.',
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

/**
 * Métricas analíticas exclusivas para o Dashboard do Assinante
 */
export const getSubscriberDashboardMetrics = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      queriesToday,
      queriesMonth,
      queriesTotal,
      declaracoesAggregate,
      spentCycleAggregate,
      queriesBySource,
      company,
      apiKeysCount,
      recentQueries
    ] = await Promise.all([
      // Consultas hoje
      prisma.query.count({
        where: { companyId, createdAt: { gte: today }, status: 'COMPLETED' }
      }),
      // Consultas no mês atual
      prisma.query.count({
        where: { companyId, createdAt: { gte: firstDayOfMonth }, status: 'COMPLETED' }
      }),
      // Total histórico de consultas
      prisma.query.count({
        where: { companyId, status: 'COMPLETED' }
      }),
      // Total de declarações de bens encontradas
      prisma.query.aggregate({
        where: { companyId, status: 'COMPLETED' },
        _sum: { totalDeclaracoes: true }
      }),
      // Gasto no mês atual
      prisma.query.aggregate({
        where: { companyId, createdAt: { gte: firstDayOfMonth }, status: 'COMPLETED' },
        _sum: { cost: true }
      }),
      // Consultas por canal (API vs WEB)
      prisma.query.groupBy({
        by: ['source'],
        where: { companyId, status: 'COMPLETED' },
        _count: { id: true }
      }),
      // Dados da empresa (modalidade, saldo, limites)
      prisma.company.findUnique({
        where: { id: companyId },
        select: {
          accountType: true,
          creditsBalance: true,
          creditLimit: true,
          billingDueDate: true,
          customQueryPrice: true,
        }
      }),
      // Chaves de API ativas
      prisma.apiKey.count({
        where: { companyId, isActive: true }
      }),
      // Últimas consultas para monitoramento
      prisma.query.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
      })
    ]);

    // Calcular distribuição API vs Web
    let totalApi = 0;
    let totalWeb = 0;
    queriesBySource.forEach(group => {
      if (group.source === 'API') totalApi = group._count.id;
      if (group.source === 'WEB') totalWeb = group._count.id;
    });

    const totalValid = totalApi + totalWeb;
    const apiPercent = totalValid > 0 ? Math.round((totalApi / totalValid) * 100) : 0;
    const webPercent = totalValid > 0 ? Math.round((totalWeb / totalValid) * 100) : 0;

    return res.json({
      success: true,
      data: {
        queriesToday,
        queriesMonth,
        queriesTotal,
        totalDeclaracoes: declaracoesAggregate._sum.totalDeclaracoes || 0,
        totalSpentMonth: Number(spentCycleAggregate._sum.cost || 0),
        distribution: {
          api: totalApi,
          web: totalWeb,
          apiPercent,
          webPercent,
        },
        company,
        apiKeysCount,
        recentQueries,
      }
    });
  } catch (error: any) {
    logger.error(`[DASHBOARD CLIENTE] Erro ao obter métricas: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao carregar métricas do dashboard.' });
  }
};
