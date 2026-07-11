import { Router } from 'express';
import * as alarmController from '../controllers/alarmController.js';

const router = Router();

router.get('/', alarmController.list);
router.get('/active-count', alarmController.getActiveCount);
router.put('/:id/status', alarmController.updateStatus);
router.post('/mark-all-read', alarmController.markAllRead);

export default router;
