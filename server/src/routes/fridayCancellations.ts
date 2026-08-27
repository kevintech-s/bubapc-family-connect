import { Router } from 'express';
import { getCancellations, getUpcomingCancellation, createCancellation, deleteCancellation } from '../controllers/fridayCancellations';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getCancellations);
router.get('/upcoming', authenticate, getUpcomingCancellation);
router.post('/', authenticate, authorize('pastor', 'family_coordinator'), createCancellation);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator'), deleteCancellation);

export default router;
