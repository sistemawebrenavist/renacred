import { Router } from 'express';
import {
  getDashboardMetrics,
  listCompanies,
  updateCompanySettings,
  adjustCreditsManual,
  superAdminQuery,
  listApiLogs,
  getLogQueryResponse,
  createCompany,
  deleteCompany,
  createApiKeyForCompany,
  revokeApiKeyAdmin,
  listCompanyUsers,
  updateUserPasswordAdmin,
  updateUserStatusAdmin,
  createCompanyUserAdmin,
  impersonateCompany,
  getProductPricingTable,
  updateProductPricingTable,
  resetProductPricingTable,
  recalculateCompanyInvoice
} from '../controllers/adminController';
import { authenticateToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Protegido por Token e SuperAdmin
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.post('/companies/:id/impersonate', impersonateCompany);

router.get('/metrics', getDashboardMetrics);
router.get('/companies', listCompanies);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompanySettings);
router.post('/companies/:id/recalculate-invoice', recalculateCompanyInvoice);
router.delete('/companies/:id', deleteCompany);
router.post('/companies/:id/credits', adjustCreditsManual);
router.post('/companies/:id/keys', createApiKeyForCompany);
router.delete('/companies/keys/:keyId', revokeApiKeyAdmin);

// Gestão de Usuários e Acesso do Assinante
router.get('/companies/:id/users', listCompanyUsers);
router.post('/companies/:id/users', createCompanyUserAdmin);
router.put('/users/:userId/password', updateUserPasswordAdmin);
router.put('/users/:userId/status', updateUserStatusAdmin);

router.post('/consulta-superadmin', superAdminQuery);
router.get('/logs/response', getLogQueryResponse);
router.get('/logs', listApiLogs);

// Tabela de Preços e Custos Globais dos Produtos
router.get('/produtos/tabela-precos', getProductPricingTable);
router.put('/produtos/tabela-precos', updateProductPricingTable);
router.post('/produtos/tabela-precos/reset', resetProductPricingTable);

export default router;
