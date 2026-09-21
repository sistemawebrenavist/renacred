import { Router } from 'express';
import { createCreditsRecharge, listTransactions, listInvoices } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.post('/recharge', createCreditsRecharge);
router.get('/transactions', listTransactions);
router.get('/invoices', listInvoices);

export default router;
