import { Router } from 'express';
import { listApiKeys, createApiKey, revokeApiKey } from '../controllers/apiKeyController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.get('/', listApiKeys);
router.post('/', createApiKey);
router.delete('/:id', revokeApiKey);

export default router;
