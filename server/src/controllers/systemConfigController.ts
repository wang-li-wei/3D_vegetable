import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, success, error } from '../utils/response.js';
import * as systemConfigService from '../services/systemConfigService.js';

const KEY_PATTERN = /^[a-zA-Z0-9_.-]{1,64}$/;
const ALLOWED_KEYS = new Set(['growth_stage', 'growth_day', 'planting_date', 'system_mode']);

const setSchema = z.object({
  value: z.string().max(1000),
});

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  const data = await systemConfigService.getAllSystemConfig();
  success(res, data);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as string;
  if (!KEY_PATTERN.test(key)) return error(res, `Invalid key: ${key}`);
  const value = await systemConfigService.getSystemConfig(key);
  if (value === null) return error(res, `Config not found: ${key}`, 404);
  success(res, { key, value });
});

export const set = asyncHandler(async (req: Request, res: Response) => {
  const key = req.params.key as string;
  if (!ALLOWED_KEYS.has(key)) return error(res, `Key not allowed: ${key}`);
  const parsed = setSchema.safeParse(req.body);
  if (!parsed.success) return error(res, 'value must be a string up to 1000 chars');
  const data = await systemConfigService.setSystemConfig(key, parsed.data.value);
  success(res, data);
});
