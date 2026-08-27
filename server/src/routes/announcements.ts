import { Router } from 'express';
import { getAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcements';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.get('/:id', authenticate, getAnnouncementById);
router.post('/', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), createAnnouncement);
router.put('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), updateAnnouncement);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator'), deleteAnnouncement);

export default router;
