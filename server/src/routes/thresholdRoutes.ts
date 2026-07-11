import { Router } from 'express';
import * as thresholdController from '../controllers/thresholdController.js';

const router = Router();

router.get('/', thresholdController.get);
router.put('/:parameter', thresholdController.update);

export default router;
