import { Router } from 'express';
import * as deviceController from '../controllers/deviceController.js';

const router = Router();

router.get('/latest', deviceController.getLatest);

export default router;
