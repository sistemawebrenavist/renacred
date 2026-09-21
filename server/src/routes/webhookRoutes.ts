import { Router } from 'express';
import { handleInfinityPayWebhook } from '../controllers/webhookController';

const router = Router();

// Webhook aberto para receber chamadas da InfinityPay
router.post('/infinitypay', handleInfinityPayWebhook);

export default router;
