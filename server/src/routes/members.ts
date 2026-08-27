import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, deleteMember, getBirthdays } from '../controllers/members';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMembers);
router.get('/birthdays', authenticate, getBirthdays);
router.get('/:id', authenticate, getMemberById);
router.post('/', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), createMember);
router.put('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), updateMember);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator'), deleteMember);

export default router;
