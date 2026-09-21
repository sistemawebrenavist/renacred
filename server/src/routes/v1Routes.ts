import { Router } from 'express';
import { consultarApiV1 } from '../controllers/imobiliarioController';
import { authenticateApiKey } from '../middlewares/apiKeyMiddleware';

const router = Router();

// Rota pública para desenvolvedores protegida por chave de API (x-api-key, Bearer ou query param ?token=)
router.post('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.get('/imobiliario/historico', authenticateApiKey, consultarApiV1);
router.post('/imobiliario', authenticateApiKey, consultarApiV1);
router.get('/imobiliario', authenticateApiKey, consultarApiV1);
router.post('/', authenticateApiKey, consultarApiV1);
router.get('/', authenticateApiKey, consultarApiV1);

export default router;
