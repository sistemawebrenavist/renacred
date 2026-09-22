import { Router } from 'express';
import { 
  consultarWeb, 
  listarHistoricoConsultas, 
  obterDetalhesConsulta,
  getSubscriberDashboardMetrics,
  excluirConsulta,
  limparHistoricoConsultas
} from '../controllers/imobiliarioController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.get('/metrics', getSubscriberDashboardMetrics);
router.post('/consultar', consultarWeb);
router.get('/historico', listarHistoricoConsultas);
router.get('/historico/:id', obterDetalhesConsulta);
router.delete('/historico/limpar-tudo', limparHistoricoConsultas);
router.delete('/historico/:id', excluirConsulta);

export default router;
