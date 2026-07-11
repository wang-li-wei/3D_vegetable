import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, success, error } from '../utils/response.js';
import * as alarmService from '../services/alarmService.js';

const ALLOWED_ALARM_STATUS = new Set(['active', 'read', 'resolved']);
const ALARM_LIMIT_MAX = 200;
const ALARM_LIMIT_DEFAULT = 50;

function parseLimit(raw: unknown): number {
  const n = parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(n) || n <= 0) return ALARM_LIMIT_DEFAULT;
  return Math.min(n, ALARM_LIMIT_MAX);
}

const updateStatusSchema = z.object({
  status: z.enum(['active', 'read', 'resolved']),
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const status = _req.query.status as string | undefined;
  if (status && !ALLOWED_ALARM_STATUS.has(status)) {
    return error(res, `Invalid status: ${status}`);
  }
  const limit = parseLimit(_req.query.limit);
  const data = await alarmService.getAlarms({ status, limit });
  success(res, data);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (!Number.isFinite(id) || id <= 0) return error(res, 'Invalid id');
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 'status must be active/read/resolved');
  }
  const data = await alarmService.updateAlarmStatus(id, parsed.data.status);
  success(res, data);
});

export const markAllRead = asyncHandler(async (_req: Request, res: Response) => {
  const data = await alarmService.markAllAlarmsRead();
  success(res, { count: data.count });
});

export const getActiveCount = asyncHandler(async (_req: Request, res: Response) => {
  const count = await alarmService.getActiveAlarmCount();
  success(res, { count });
});
