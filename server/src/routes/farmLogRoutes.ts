import { Router } from 'express';
import * as farmLogController from '../controllers/farmLogController.js';

const router = Router();

router.get('/', farmLogController.list);

export default router;
