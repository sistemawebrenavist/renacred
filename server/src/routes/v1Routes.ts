import { Router } from 'express';
import { consultarApiV1 } from '../controllers/imobiliarioController';
import { consultarVeicularApiV1 } from '../controllers/veicularController';
import { authenticateApiKey } from '../middlewares/apiKeyMiddleware';

const router = Router();

// PRODUTO E1: Histórico Imobiliário & Cartórios
router.post('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.get('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.post('/imobiliario', authenticateApiKey, consultarApiV1);
router.get('/imobiliario', authenticateApiKey, consultarApiV1);

// PRODUTO E2: Histórico de Proprietários Veiculares
router.post('/veicular/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.get('/veicular/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.post('/proprietarios', authenticateApiKey, consultarVeicularApiV1);
router.get('/proprietarios', authenticateApiKey, consultarVeicularApiV1);

// Fallback raiz para parâmetros diretos
router.post('/', authenticateApiKey, (req, res, next) => {
  if (req.query.placa || req.body?.placa) {
    return consultarVeicularApiV1(req, res);
  }
  return consultarApiV1(req, res);
});
router.get('/', authenticateApiKey, (req, res, next) => {
  if (req.query.placa || req.body?.placa) {
    return consultarVeicularApiV1(req, res);
  }
  return consultarApiV1(req, res);
});

export default router;
