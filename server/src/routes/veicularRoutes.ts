import { Router } from 'express';
import { 
  consultarVeicularWeb, 
  listarHistoricoVeicular 
} from '../controllers/veicularController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Consulta Web autenticada de Histórico de Proprietários (PRODUTO E2)
router.post('/proprietarios', consultarVeicularWeb);
router.post('/consultar', consultarVeicularWeb);
router.get('/historico', listarHistoricoVeicular);

export default router;
