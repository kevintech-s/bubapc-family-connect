import { Router } from 'express';
import { getPhotos, createPhoto, deletePhoto } from '../controllers/photos';
import { authenticate, authorize } from '../middleware/auth';
import upload from '../middleware/upload';

const router = Router();

router.get('/', authenticate, getPhotos);
router.post('/', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), upload.single('photo'), createPhoto);
router.delete('/:id', authenticate, authorize('pastor', 'family_coordinator', 'family_leader'), deletePhoto);

export default router;
