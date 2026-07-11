import { Router } from 'express';
import * as systemConfigController from '../controllers/systemConfigController.js';

const router = Router();

router.get('/', systemConfigController.getAll);
router.get('/:key', systemConfigController.getOne);
router.put('/:key', systemConfigController.set);

export default router;
