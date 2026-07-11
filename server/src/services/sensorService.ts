import { prisma } from '../utils/prisma.js';

const NUMERIC_FIELDS = ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

/** 传感器原始 payload（来自 ESP32） */
export interface RawSensorPayload {
  air_temp?: number;
  air_hum?: number;
  nutrient_temp?: number;
  light?: number;
  ph?: number;
}

/** 规整后的传感器数据（所有字段必须为有限数） */
export interface NormalizedSensor {
  airTemp: number;
  airHum: number;
  nutrientTemp: number;
  light: number;
  ph: number;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * 校验并归一化传感器数据。
 * 任何字段缺失或非有限数则抛错 —— 避免 0 值污染曲线、触发假报警。
 */
export function normalizeSensor(raw: unknown): NormalizedSensor {
  if (!raw || typeof raw !== 'object') {
    throw new Error('sensor data must be an object');
  }
  const o = raw as Record<string, unknown>;
  const result: Partial<NormalizedSensor> = {};
  const map: Record<NumericField, keyof NormalizedSensor> = {
    air_temp: 'airTemp',
    air_hum: 'airHum',
    nutrient_temp: 'nutrientTemp',
    light: 'light',
    ph: 'ph',
  };
  for (const src of NUMERIC_FIELDS) {
    const v = o[src];
    if (!isFiniteNumber(v)) {
      throw new Error(`sensor.${src} missing or invalid: ${String(v)}`);
    }
    result[map[src]] = v;
  }
  return result as NormalizedSensor;
}

/**
 * 原子写入 sensor + device status。
 * 单事务：要么都成功要么都不成功，避免出现 sensor 有但 status 缺失的孤儿数据。
 */
export async function saveSensorAndStatus(input: {
  deviceId: string;
  sensor: NormalizedSensor;
  status?: Record<string, unknown>;
}) {
  const { deviceId, sensor, status } = input;
  return prisma.$transaction(async (tx) => {
    await tx.sensorData.create({
      data: {
        deviceId,
        airTemp: sensor.airTemp,
        airHum: sensor.airHum,
        nutrientTemp: sensor.nutrientTemp,
        light: sensor.light,
        ph: sensor.ph,
      },
    });
    if (status) {
      await tx.deviceStatus.create({
        data: {
          deviceId,
          heater: Boolean(status.heater),
          cooler: Boolean(status.cooler),
          mister: Boolean(status.mister),
          pump: Boolean(status.pump),
          pidEnabled: Boolean(status.pid_enabled),
          timerMisterEnabled: Boolean(status.timer_mister_enabled),
          targetTempMin: isFiniteNumber(status.target_temp_min) ? status.target_temp_min : 18,
          targetTempMax: isFiniteNumber(status.target_temp_max) ? status.target_temp_max : 22,
        },
      });
    }
  });
}

/** 旧接口（保留向后兼容） */
export async function saveSensorData(data: {
  deviceId: string;
  airTemp: number;
  airHum: number;
  nutrientTemp: number;
  light: number;
  ph: number;
}) {
  return prisma.sensorData.create({ data });
}

/** 字段映射（查询用） */
const FIELD_MAP: Record<string, 'airTemp' | 'airHum' | 'nutrientTemp' | 'light' | 'ph'> = {
  air_temp: 'airTemp',
  air_hum: 'airHum',
  nutrient_temp: 'nutrientTemp',
  light: 'light',
  ph: 'ph',
};

/**
 * 查询传感器历史 —— 区间下采样。
 * 当请求行数 > 500 时按 5 分钟 bucket 聚合（avg），避免前端一次拿 10000 个点。
 */
export async function getSensorHistory(params: {
  parameter: string;
  hours?: number;
  limit?: number;
}) {
  const { parameter, hours = 24, limit = 500 } = params;
  const field = FIELD_MAP[parameter];
  if (!field) return [];
  const since = new Date(Date.now() - hours * 3600 * 1000);

  // 行数较少时直接返回原始数据
  if (limit <= 500) {
    const records = await prisma.sensorData.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      take: Math.min(limit, 5000),
    });
    return records.map((r) => ({ timestamp: r.recordedAt.getTime(), value: r[field] as number }));
  }

  // 大量请求走 SQL 聚合（5 分钟 bucket 平均）
  const bucketSec = 300; // 5 min
  const records = await prisma.$queryRawUnsafe<
    { bucket: Date; avg: number | null }[]
  >(
    `SELECT date_trunc('minute', recorded_at) - ` +
      `INTERVAL '${bucketSec} seconds' * (EXTRACT(MINUTE FROM recorded_at)::int / ${bucketSec}) AS bucket, ` +
      `AVG(${field}) AS avg ` +
      `FROM sensor_data WHERE recorded_at >= $1 ` +
      `GROUP BY bucket ORDER BY bucket ASC LIMIT ${Math.min(limit, 2000)}`,
    since
  );
  return records
    .filter((r): r is { bucket: Date; avg: number } => r.avg !== null)
    .map((r) => ({ timestamp: r.bucket.getTime(), value: Number(r.avg) }));
}

/** 最新一条 */
export async function getLatestSensorData() {
  const record = await prisma.sensorData.findFirst({
    orderBy: { recordedAt: 'desc' },
  });
  if (!record) return null;
  return {
    air_temp: record.airTemp,
    air_hum: record.airHum,
    nutrient_temp: record.nutrientTemp,
    light: record.light,
    ph: record.ph,
  };
}

/** 删除 N 天前的数据（保留策略） */
export async function pruneOldData(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 86400 * 1000);
  const [sensors, statuses, alarms, logs] = await prisma.$transaction([
    prisma.sensorData.deleteMany({ where: { recordedAt: { lt: cutoff } } }),
    prisma.deviceStatus.deleteMany({ where: { recordedAt: { lt: cutoff } } }),
    prisma.alarm.deleteMany({ where: { createdAt: { lt: cutoff }, status: { in: ['read', 'resolved'] } } }),
    prisma.farmLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return {
    sensors: sensors.count,
    statuses: statuses.count,
    alarms: alarms.count,
    logs: logs.count,
  };
}
