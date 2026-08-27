import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getDashboardStats);

export default router;
