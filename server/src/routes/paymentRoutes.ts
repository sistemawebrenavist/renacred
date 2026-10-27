import { Router } from 'express';
import { 
  createCreditsRecharge, 
  listTransactions, 
  listInvoices, 
  getSubscriptionDetails, 
  payInvoiceCheckout,
  getConsumptionStatement
} from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.post('/recharge', createCreditsRecharge);
router.get('/transactions', listTransactions);
router.get('/invoices', listInvoices);
router.get('/subscription', getSubscriptionDetails);
router.post('/invoices/:id/pay', payInvoiceCheckout);
router.get('/consumption-statement', getConsumptionStatement);

export default router;
