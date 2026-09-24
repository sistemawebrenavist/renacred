import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticateToken } from '../middlewares/authMiddleware';
import { executarConsultaWeb } from '../controllers/consultaUnificadaController';
import { SERVER_PRODUCTS } from '../config/productsCatalog';

const router = Router();
router.use(authenticateToken);

// Catálogo de produtos oficiais com dados de faturamento da empresa
router.get('/catalogo', async (req: any, res) => {
  const company = req.user?.company;
  const isSuperAdmin = !!req.user?.isSuperAdmin;

  const catalogWithPrices = SERVER_PRODUCTS.map((p) => {
    const customPrice = company?.customQueryPrice ? Number(company.customQueryPrice) : null;
    return {
      code: p.code,
      slug: p.slug,
      name: p.name,
      category: p.category,
      inputType: p.inputType,
      defaultCost: p.defaultCost,
      unitPrice: isSuperAdmin ? 0 : (customPrice || p.defaultPrice),
      hasContingency: p.apiContingencies.length > 0
    };
  });

  return res.json({
    success: true,
    total: catalogWithPrices.length,
    produtos: catalogWithPrices
  });
});

// Execução de consulta web autenticada por código ou slug
router.post('/executar/:codigo', executarConsultaWeb);
router.post('/:codigo', executarConsultaWeb);

// Listagem de histórico recente com filtro opcional por produto
router.get('/historico', async (req: any, res) => {
  try {
    const companyId = req.user.companyId;
    const { produto, limit } = req.query;
    const take = limit ? Math.min(parseInt(limit as string, 10), 50) : 10;

    const where: any = { companyId };

    if (produto) {
      const prodCode = (produto as string).trim().toUpperCase();
      where.requestData = {
        path: ['product'],
        equals: prodCode
      };
    }

    const queries = await prisma.query.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: primaryKeySelector(),
        identifier: true,
        source: true,
        status: true,
        cost: true,
        totalDeclaracoes: true,
        processingTimeMs: true,
        requestData: true,
        resultData: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      queries: queries.map((q) => {
        const reqData: any = q.requestData || {};
        return {
          id: q.id,
          identifier: q.identifier,
          documento: q.identifier,
          produtoCodigo: reqData.product || 'E1',
          produtoNome: reqData.productName || 'Consulta Oficial',
          source: q.source,
          status: q.status,
          cost: Number(q.cost),
          totalRegistros: q.totalDeclaracoes,
          processingTimeMs: q.processingTimeMs,
          hash: reqData.hash,
          createdAt: q.createdAt,
          hasData: q.totalDeclaracoes > 0
        };
      })
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Detalhes completos de uma consulta gravada (Reabertura instantânea do Laudo)
router.get('/detalhes/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const query = await prisma.query.findFirst({
      where: { id, companyId }
    });

    if (!query) {
      return res.status(404).json({ success: false, message: 'Consulta não encontrada.' });
    }

    const reqData: any = query.requestData || {};

    return res.json({
      success: true,
      query: {
        id: query.id,
        identifier: query.identifier,
        produtoCodigo: reqData.product || 'E1',
        produtoNome: reqData.productName || 'Consulta Oficial',
        source: query.source,
        status: query.status,
        cost: Number(query.cost),
        totalRegistros: query.totalDeclaracoes,
        processingTimeMs: query.processingTimeMs,
        hash: reqData.hash,
        createdAt: query.createdAt,
        resultData: query.resultData
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

function primaryKeySelector() {
  return true;
}

export default router;
