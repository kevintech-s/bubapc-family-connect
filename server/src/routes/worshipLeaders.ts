import { Router } from 'express';
import { getWorshipLeaders, createWorshipLeader, updateWorshipLeader, deleteWorshipLeader } from '../controllers/worshipLeaders';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getWorshipLeaders);
router.post('/', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), createWorshipLeader);
router.put('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), updateWorshipLeader);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator'), deleteWorshipLeader);

export default router;
