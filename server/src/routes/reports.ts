import { Router } from 'express';
import { getReports, uploadReport, deleteReport } from '../controllers/reports';
import { authenticate, authorize } from '../middleware/auth';
import uploadDocument from '../middleware/uploadDocument';

const router = Router();

router.get('/', authenticate, getReports);
router.post('/', authenticate, authorize('family_leader', 'family_coordinator'), uploadDocument.single('file'), uploadReport);
router.delete('/:id', authenticate, authorize('family_leader', 'family_coordinator', 'pastor'), deleteReport);

export default router;
