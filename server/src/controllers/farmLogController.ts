import { Request, Response } from 'express';
import { asyncHandler, success } from '../utils/response.js';
import * as farmLogService from '../services/farmLogService.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await farmLogService.getFarmLogs({ limit });
  success(res, data);
});
