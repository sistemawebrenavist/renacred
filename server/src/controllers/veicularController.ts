import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { fetchbrasilService } from '../services/fetchbrasil.service';
import { billingService, BillingCheckResult } from '../services/billing.service';
import { logger } from '../utils/logger';
import { QuerySource, QueryStatus } from '../types/database';

/**
 * Validador e normalizador de placa veicular (Padrão Antigo e Mercosul)
 */
export function validatePlaca(placaInput: string): { valid: boolean; cleaned: string } {
  if (!placaInput || typeof placaInput !== 'string') {
    return { valid: false, cleaned: '' };
  }
  const cleaned = placaInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Padrão antigo: AAA9999 | Padrão Mercosul: AAA9A99
  const regexPadrao = /^[A-Z]{3}[0-9]{4}$/;
  const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  const valid = regexPadrao.test(cleaned) || regexMercosul.test(cleaned);
  return { valid, cleaned };
}

/**
 * Consulta de Histórico de Proprietários Veiculares via Painel Web (JWT) - PRODUTO E2
 */
export const consultarVeicularWeb = async (req: any, res: Response) => {
  const startTime = Date.now();
  const companyId = req.user.companyId;
  const userId = req.user.id;
  const { placa } = req.body;

  if (!placa) {
    return res.status(400).json({ success: false, message: 'Placa do veículo é obrigatória.' });
  }

  const validation = validatePlaca(placa);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: 'Placa informada é inválida. Utilize o formato tradicional (ABC-1234) ou Mercosul (ABC1D23).'
    });
  }

  const cleanPlaca = validation.cleaned;

  // 1. Validar elegibilidade de faturamento (Saldo pré-pago ou Limite pós-pago)
  const isSuperAdmin = !!req.user?.isSuperAdmin;
  let eligibility: BillingCheckResult = { allowed: true, price: 0 };

  if (!isSuperAdmin) {
    const check = await billingService.checkEligibility(companyId, req.user?.company);
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
    // 2. Chamar o serviço com ordenação cronológica ascendente da mais antiga para a mais recente
    const result = await fetchbrasilService.consultarHistoricoProprietario(cleanPlaca);
    const processingTimeMs = Date.now() - startTime;

    const totalRegistros = result.total !== undefined ? result.total : (result.historico ? result.historico.length : 0);
    const hasData = totalRegistros > 0 && Array.isArray(result.historico) && result.historico.length > 0;
    const finalCost = (!isSuperAdmin && hasData) ? eligibility.price : 0;

    // 3. Registrar a consulta no banco de dados identificando PRODUTO E2
    const queryRecord = await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanPlaca,
        source: QuerySource.WEB,
        status: QueryStatus.COMPLETED,
        cost: finalCost,
        totalDeclaracoes: totalRegistros,
        processingTimeMs,
        requestData: {
          product: 'E2',
          productName: 'Histórico de Proprietários',
          placa: cleanPlaca,
        },
        resultData: result as any,
      }
    });

    // 4. Executar débito financeiro apenas quando houver dados e para clientes regulares
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
    logger.error(`[VEICULAR WEB] Erro na consulta da placa ${cleanPlaca}: ${error.message}`);

    await prisma.query.create({
      data: {
        companyId,
        userId,
        identifier: cleanPlaca,
        source: QuerySource.WEB,
        status: QueryStatus.ERROR,
        cost: 0,
        processingTimeMs,
        requestData: {
          product: 'E2',
          placa: cleanPlaca,
        },
        errorData: { message: error.message },
      }
    });

    const isProviderBlocked = error.message && error.message.includes('403');
    const userMessage = isProviderBlocked
      ? (isSuperAdmin
          ? 'O provedor de dados veiculares bloqueou o acesso deste servidor (HTTP 403 Cloudflare). Verifique o IP 209.50.245.165.'
          : 'Serviço de consulta veicular temporariamente indisponível no momento. Tente novamente em alguns instantes.')
      : (isSuperAdmin
          ? (error.message || 'Erro ao processar consulta de histórico veicular.')
          : 'Erro ao processar consulta de histórico veicular. Tente novamente em alguns instantes.');

    return res.status(500).json({
      success: false,
      code: isProviderBlocked ? 'PROVIDER_BLOCKED_403' : 'QUERY_ERROR',
      message: userMessage,
    });
  }
};

/**
 * Consulta de Histórico de Proprietários via API Externa REST (POST / GET /v1/veicular/proprietarios)
 */
export const consultarVeicularApiV1 = async (req: any, res: Response) => {
  const startTime = Date.now();
  const company = req.company;
  const apiKey = req.apiKey;
  const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || '';

  const targetPlaca =
    req.query.query ||
    req.query.placa ||
    req.body?.query ||
    req.body?.placa;

  if (!targetPlaca) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_PLACA',
      message: 'Parâmetro query ou placa é obrigatório. Exemplo: ?query=ATT0849 ou ?placa=ATT0849.',
    });
  }

  const validation = validatePlaca(String(targetPlaca));
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PLACA',
      message: 'A placa fornecida não possui formato válido (AAA-9999 ou padrão Mercosul AAA9A99).',
    });
  }

  const cleanPlaca = validation.cleaned;

  // 1. Checar elegibilidade de faturamento
  const eligibility = await billingService.checkEligibility(company.id, company);
  if (!eligibility.allowed) {
    setImmediate(() => {
      prisma.apiLog.create({
        data: {
          apiKeyId: apiKey.id,
          companyId: company.id,
          endpoint: req.originalUrl || '/v1/veicular/proprietarios',
          method: req.method,
          statusCode: 402,
          responseTimeMs: Date.now() - startTime,
          ipAddress: clientIp,
        }
      }).catch(e => logger.error(`[API LOG E2] Erro ao gravar log 402: ${e.message}`));
    });

    return res.status(402).json({
      success: false,
      code: eligibility.code,
      message: eligibility.message,
    });
  }

  try {
    // 2. Chamar o serviço com ordenação cronológica ascendente da mais antiga para a mais recente
    const result = await fetchbrasilService.consultarHistoricoProprietario(cleanPlaca);
    const responseTimeMs = Date.now() - startTime;
    const totalRegistros = result.total !== undefined ? result.total : (result.historico ? result.historico.length : 0);
    const hasData = totalRegistros > 0 && Array.isArray(result.historico) && result.historico.length > 0;

    // 3. Regra de Negócio: Se NÃO houver dados, CUSTO ZERO
    if (!hasData) {
      setImmediate(async () => {
        try {
          await Promise.all([
            prisma.query.create({
              data: {
                companyId: company.id,
                identifier: cleanPlaca,
                source: QuerySource.API,
                status: QueryStatus.COMPLETED,
                cost: 0,
                totalDeclaracoes: 0,
                processingTimeMs: responseTimeMs,
                requestData: { product: 'E2', placa: cleanPlaca },
                resultData: result as any,
              }
            }),
            prisma.apiLog.create({
              data: {
                apiKeyId: apiKey.id,
                companyId: company.id,
                endpoint: req.originalUrl || '/v1/veicular/proprietarios',
                method: req.method,
                statusCode: 200,
                responseTimeMs,
                ipAddress: clientIp,
                creditsUsed: 0,
              }
            })
          ]);
        } catch (e: any) {
          logger.error(`[API V1 E2] Erro na gravação em background de query sem dados: ${e.message}`);
        }
      });

      return res.status(200).json({
        success: true,
        placa: cleanPlaca,
        renavam: result.renavam || '',
        total: 0,
        proprietario_atual: null,
        historico: [],
        mensagem: 'Nenhum histórico de proprietários localizado para esta placa veicular.',
        custo_debitado: 0.00,
        api_central: {
          api_utilizada: 'historico_proprietario',
          parametro_utilizado: 'placa',
          query_fornecida: cleanPlaca,
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
        identifier: cleanPlaca,
        source: QuerySource.API,
        status: QueryStatus.COMPLETED,
        cost: queryCost,
        totalDeclaracoes: totalRegistros,
        processingTimeMs: responseTimeMs,
        requestData: { product: 'E2', placa: cleanPlaca },
        resultData: result as any,
      }
    });

    // Débito financeiro
    await billingService.chargeQuery(company.id, queryRecord.id, queryCost);

    // Gravação de apiLog assíncrona
    setImmediate(() => {
      prisma.apiLog.create({
        data: {
          apiKeyId: apiKey.id,
          companyId: company.id,
          endpoint: req.originalUrl || '/v1/veicular/proprietarios',
          method: req.method,
          statusCode: 200,
          responseTimeMs,
          ipAddress: clientIp,
          creditsUsed: queryCost,
        }
      }).catch(e => logger.error(`[API LOG E2] Erro ao gravar log: ${e.message}`));
    });

    return res.status(200).json({
      success: true,
      placa: result.placa || cleanPlaca,
      renavam: result.renavam,
      consulta_em: result.consulta_em,
      total: totalRegistros,
      proprietario_atual: result.proprietario_atual,
      historico: result.historico,
      custo_debitado: queryCost,
      api_central: {
        api_utilizada: 'historico_proprietario',
        parametro_utilizado: 'placa',
        query_fornecida: cleanPlaca,
        timestamp: new Date().toISOString(),
        tempo_resposta_ms: responseTimeMs,
      }
    });
  } catch (error: any) {
    const responseTimeMs = Date.now() - startTime;
    logger.error(`[API V1 E2] Erro na requisição para placa ${cleanPlaca}: ${error.message}`);

    await prisma.apiLog.create({
      data: {
        apiKeyId: apiKey.id,
        companyId: company.id,
        endpoint: req.originalUrl || '/v1/veicular/proprietarios',
        method: req.method,
        statusCode: 500,
        responseTimeMs,
        ipAddress: clientIp,
      }
    });

    return res.status(500).json({
      success: false,
      code: 'QUERY_ERROR',
      message: 'Não foi possível processar a consulta de histórico veicular no momento. Tente novamente em instantes.',
    });
  }
};

/**
 * Listar histórico de consultas veiculares (E2) da empresa
 */
export const listarHistoricoVeicular = async (req: any, res: Response) => {
  try {
    const companyId = req.user.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Buscar consultas que tenham requestData.product == 'E2' ou onde identifier tenha formato de placa
    const [queries, total] = await Promise.all([
      prisma.query.findMany({
        where: {
          companyId,
          OR: [
            { requestData: { path: ['product'], equals: 'E2' } },
            { identifier: { not: { contains: '.' } } } // placas não contêm pontos de CPF
          ]
        },
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
          requestData: true,
          resultData: true,
        }
      }),
      prisma.query.count({
        where: {
          companyId,
          OR: [
            { requestData: { path: ['product'], equals: 'E2' } },
            { identifier: { not: { contains: '.' } } }
          ]
        }
      })
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
    logger.error(`[HISTORICO VEICULAR] Erro ao listar: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Erro ao listar histórico de consultas veiculares.' });
  }
};
