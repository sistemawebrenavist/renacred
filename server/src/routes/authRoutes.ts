import { Router } from 'express';
import { login, getProfile, updateProfile, updateCompanyContact } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/company', authenticateToken, updateCompanyContact);

export default router;
