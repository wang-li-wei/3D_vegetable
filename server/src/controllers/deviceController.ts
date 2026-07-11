import { Request, Response } from 'express';
import { asyncHandler, success, error } from '../utils/response.js';
import * as deviceService from '../services/deviceService.js';

export const getLatest = asyncHandler(async (_req: Request, res: Response) => {
  const data = await deviceService.getLatestDeviceStatus();
  if (!data) return error(res, 'No device status found', 404);
  success(res, data);
});
