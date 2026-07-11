import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, success, error } from '../utils/response.js';
import * as thresholdService from '../services/thresholdService.js';

const PARAMETERS = ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'] as const;

const updateSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
}).refine((d) => d.min < d.max, { message: 'min must be < max' });

export const get = asyncHandler(async (_req: Request, res: Response) => {
  const data = await thresholdService.getThresholds();
  success(res, data);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parameter = req.params.parameter as string;
  if (!PARAMETERS.includes(parameter as (typeof PARAMETERS)[number])) {
    return error(res, `Invalid parameter: ${parameter}`);
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.issues[0]?.message ?? 'Invalid input');
  }
  const data = await thresholdService.updateThreshold(parameter, parsed.data.min, parsed.data.max);
  success(res, data);
});
