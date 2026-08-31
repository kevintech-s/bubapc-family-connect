import { Router } from 'express';
import { authenticate, authorizeMinRole } from '../middleware/auth';
import { getDevotions, createDevotion, updateDevotion, deleteDevotion } from '../controllers/devotions';

const router = Router();

router.use(authenticate);

router.get('/', getDevotions);
router.post('/', authorizeMinRole('family_leader'), createDevotion);
router.put('/:id', authorizeMinRole('family_leader'), updateDevotion);
router.delete('/:id', authorizeMinRole('family_leader'), deleteDevotion);

export default router;
