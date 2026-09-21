import { Router } from 'express';
import { login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);

export default router;
