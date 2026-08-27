import { Router } from 'express';
import { getFamilies, getFamilyById, createFamily, updateFamily, deleteFamily } from '../controllers/families';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getFamilies);
router.get('/:id', authenticate, getFamilyById);
router.post('/', authenticate, authorize('pastor', 'family_coordinator'), createFamily);
router.put('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), updateFamily);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator'), deleteFamily);

export default router;
