import { Router } from 'express';
import {
  getDashboardMetrics,
  listCompanies,
  updateCompanySettings,
  adjustCreditsManual,
  superAdminQuery,
  listApiLogs,
  createCompany,
  deleteCompany,
  createApiKeyForCompany,
  revokeApiKeyAdmin
} from '../controllers/adminController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Protegido por Token e SuperAdmin
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get('/metrics', getDashboardMetrics);
router.get('/companies', listCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompanySettings);
router.delete('/companies/:id', deleteCompany);
router.post('/companies/:id/credits', adjustCreditsManual);
router.post('/companies/:id/keys', createApiKeyForCompany);
router.delete('/companies/keys/:keyId', revokeApiKeyAdmin);
router.post('/consulta-superadmin', superAdminQuery);
router.get('/logs', listApiLogs);

export default router;
