import { Router } from 'express';
import { consultarApiV1 } from '../controllers/imobiliarioController';
import { consultarVeicularApiV1 } from '../controllers/veicularController';
import { executarConsultaApiV1 } from '../controllers/consultaUnificadaController';
import { authenticateApiKey } from '../middlewares/apiKeyMiddleware';

const router = Router();

// PRODUTO E1: Histórico Imobiliário & Cartórios (Retrocompatibilidade)
router.post('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.get('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.post('/imobiliario', authenticateApiKey, consultarApiV1);
router.get('/imobiliario', authenticateApiKey, consultarApiV1);

// PRODUTO E2: Histórico de Proprietários Veiculares (Retrocompatibilidade)
router.post('/veicular/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.get('/veicular/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.post('/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.get('/proprietarios', authenticateApiKey, consultarVeicularApiV1);

// ROTA DINÂMICA PARA TODOS OS 16 PRODUTOS (E1 a E16, Slugs e Aliases)
// Ex: /v1/e3, /v1/frota, /v1/e5, /v1/roubo-furto, /v1/renajud, /v1/cnh, etc.
router.post('/:codigo', authenticateApiKey, (req, res, next) => {
  return executarConsultaApiV1(req, res);
});
router.get('/:codigo', authenticateApiKey, (req, res, next) => {
  return executarConsultaApiV1(req, res);
});

// Fallback raiz para parâmetros diretos (?api=... ou ?token=...&query=...)
router.post('/', authenticateApiKey, (req, res) => {
  if (req.query.api || req.body?.api || req.query.produto || req.body?.produto) {
    return executarConsultaApiV1(req, res);
  }
  if (req.query.placa || req.body?.placa) {
    return consultarVeicularApiV1(req, res);
  }
  return consultarApiV1(req, res);
});

router.get('/', authenticateApiKey, (req, res) => {
  if (req.query.api || req.body?.api || req.query.produto || req.body?.produto) {
    return executarConsultaApiV1(req, res);
  }
  if (req.query.placa || req.body?.placa) {
    return consultarVeicularApiV1(req, res);
  }
  return consultarApiV1(req, res);
});

export default router;
