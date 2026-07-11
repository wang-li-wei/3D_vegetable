import { Router } from 'express';
import { z } from 'zod';
import { publishCommand } from '../services/mqttService.js';
import { asyncHandler, success, error } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';

const router = Router();

const commandSchema = z.object({
  device: z.enum(['heater', 'cooler', 'mister', 'pump', 'mode', 'target_temp', 'target_temp_max', 'pid_control', 'timer_mister']),
  action: z.enum(['on', 'off', 'auto', 'manual', 'set']),
  value: z.number().finite().optional(),
  timestamp: z.number().int().gt(0).optional(),
}).strict();

// 发送设备控制命令
router.post('/command', asyncHandler(async (req, res) => {
  const parsed = commandSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, `Invalid command: ${parsed.error.issues[0]?.message ?? ''}`);
  }
  const ok = publishCommand(parsed.data);
  if (!ok) return error(res, 'MQTT not connected', 503);
  success(res, { sent: true });
}));

// 获取设备实时状态（从数据库最新记录）
router.get('/status', asyncHandler(async (_req, res) => {
  const [sensor, device] = await Promise.all([
    prisma.sensorData.findFirst({ orderBy: { recordedAt: 'desc' } }),
    prisma.deviceStatus.findFirst({ orderBy: { recordedAt: 'desc' } }),
  ]);

  const online = sensor && (Date.now() - sensor.recordedAt.getTime() < 30000);

  success(res, {
    online: !!online,
    lastSeen: sensor?.recordedAt ?? null,
    sensor: sensor ? {
      air_temp: sensor.airTemp,
      air_hum: sensor.airHum,
      nutrient_temp: sensor.nutrientTemp,
      light: sensor.light,
      ph: sensor.ph,
    } : null,
    device: device ? {
      heater: device.heater,
      cooler: device.cooler,
      mister: device.mister,
      pump: device.pump,
      pid_enabled: device.pidEnabled,
      timer_mister_enabled: device.timerMisterEnabled,
      target_temp_min: device.targetTempMin,
      target_temp_max: device.targetTempMax,
    } : null,
  });
}));

export default router;
