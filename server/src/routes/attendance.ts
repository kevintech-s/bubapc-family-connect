import { Router } from 'express';
import { authenticate, authorizeMinRole } from '../middleware/auth';
import {
  getAttendanceByDate,
  getMembersByDate,
  checkIn,
  undoCheckIn,
  getAttendanceStats,
} from '../controllers/attendance';

const router = Router();

router.use(authenticate);

router.get('/', getAttendanceByDate);
router.get('/members', getMembersByDate);
router.get('/stats', getAttendanceStats);
router.post('/check-in', authorizeMinRole('family_leader'), checkIn);
router.post('/undo', authorizeMinRole('family_leader'), undoCheckIn);

export default router;
