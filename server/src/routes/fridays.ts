import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getFridayQuestion,
  createFridayQuestion,
  answerFridayQuestion,
} from '../controllers/fridays';

const router = Router();

router.use(authenticate);

router.get('/question', getFridayQuestion);
router.post('/question', createFridayQuestion);
router.post('/question/:id/answer', answerFridayQuestion);

export default router;
