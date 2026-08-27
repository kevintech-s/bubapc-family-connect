import { Router } from 'express';
import { getPrayerRequests, createPrayerRequest, updatePrayerRequest, deletePrayerRequest, forwardPrayerRequest } from '../controllers/prayerRequests';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getPrayerRequests);
router.post('/', authenticate, createPrayerRequest);
router.put('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), updatePrayerRequest);
router.post('/:id/forward', authenticate, authorize('family_leader'), forwardPrayerRequest);
router.delete('/:id', authenticate, authorize('pastor'), deletePrayerRequest);

export default router;
