import { Router } from 'express';
import { register, login, getMe, updateProfile, getUsers, updateUserRole, updateUserStatus, uploadProfilePhoto } from '../controllers/auth';
import { authenticate, authorize } from '../middleware/auth';
import upload from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/photo', authenticate, upload.single('photo'), uploadProfilePhoto);

router.get('/users', authenticate, authorize('pastor', 'family_coordinator'), getUsers);
router.put('/users/:id/role', authenticate, authorize('pastor'), updateUserRole);
router.put('/users/:id/status', authenticate, authorize('pastor'), updateUserStatus);

export default router;
