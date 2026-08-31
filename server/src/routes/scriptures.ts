import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getScriptureOfDay, setScriptureOfDay } from '../controllers/scriptures';

const router = Router();

router.use(authenticate);

router.get('/', getScriptureOfDay);
router.post('/', setScriptureOfDay);

export default router;
