import { Request, Response } from 'express';
import { asyncHandler, success, error } from '../utils/response.js';
import * as sensorService from '../services/sensorService.js';

export const getLatest = asyncHandler(async (_req: Request, res: Response) => {
  const data = await sensorService.getLatestSensorData();
  if (!data) return error(res, 'No sensor data found', 404);
  success(res, data);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const parameter = req.params.parameter as string;
  const hours = parseInt(req.query.hours as string) || 24;
  const limit = parseInt(req.query.limit as string) || 500;

  const validParams = ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'];
  if (!validParams.includes(parameter)) {
    return error(res, `Invalid parameter: ${parameter}`);
  }

  const data = await sensorService.getSensorHistory({ parameter, hours, limit });
  success(res, data);
});
