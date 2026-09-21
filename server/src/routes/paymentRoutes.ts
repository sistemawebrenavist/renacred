import { Router } from 'express';
import { 
  createCreditsRecharge, 
  listTransactions, 
  listInvoices, 
  getSubscriptionDetails, 
  payInvoiceCheckout 
} from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.post('/recharge', createCreditsRecharge);
router.get('/transactions', listTransactions);
router.get('/invoices', listInvoices);
router.get('/subscription', getSubscriptionDetails);
router.post('/invoices/:id/pay', payInvoiceCheckout);

export default router;
