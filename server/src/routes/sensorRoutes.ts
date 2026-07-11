import { Router } from 'express';
import * as sensorController from '../controllers/sensorController.js';

const router = Router();

router.get('/latest', sensorController.getLatest);
router.get('/history/:parameter', sensorController.getHistory);

export default router;
