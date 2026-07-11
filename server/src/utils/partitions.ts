// 数据库分区初始化脚本
// 使用 PostgreSQL 声明式分区（RANGE by recorded_at）
// 启动时调用一次，幂等可重复执行
import { prisma } from '../utils/prisma.js';

const RETENTION_DAYS = Number(process.env.SENSOR_RETENTION_DAYS || 30);

/**
 * 初始化 SensorData / DeviceStatus 表为按月 RANGE 分区表。
 *
 *  - 自动创建从 2024-01 到当前年+1 的分区（覆盖未来 1 年）
 *  - 启动时调用一次，IF NOT EXISTS 保证幂等
 *  - 真正的清理由 pruneOldData() 配合定时任务完成（删 30 天前）
 */
export async function ensurePartitions() {
  await ensureMonthlyPartitions('sensor_data');
  await ensureMonthlyPartitions('device_status');
  await ensureIndexes();
}

async function ensureMonthlyPartitions(table: string) {
  const result = await prisma.$queryRawUnsafe<{ relkind: string }[]>(
    `SELECT relkind FROM pg_class WHERE relname = $1`,
    table
  );
  if (!result[0] || result[0].relkind !== 'p') {
    // 不是分区表 —— 检查是否已有数据
    const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM ${table}`
    );
    const n = Number(count[0]?.count ?? 0);
    if (n > 0) {
      console.warn(
        `[Partition] ${table} is not partitioned but has ${n} rows; renaming to ${table}_legacy and recreating.`
      );
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
      await createPartitionedTable(table);
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${table} SELECT * FROM ${table}_legacy ON CONFLICT DO NOTHING`
      );
    } else {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${table}`);
      await createPartitionedTableFromPrisma(table);
    }
  }
  await ensureFuturePartitions(table);
}

/** 从 _legacy 表结构创建分区表（已有数据迁移场景） */
async function createPartitionedTable(table: string) {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE ${table} (LIKE ${table}_legacy INCLUDING ALL) PARTITION BY RANGE (recorded_at)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE ${table}_default PARTITION OF ${table} DEFAULT`
  );
}

/** 空表场景：直接用 Prisma schema 定义的字段创建分区表 */
async function createPartitionedTableFromPrisma(table: string) {
  if (table === 'sensor_data') {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE sensor_data (
        id            SERIAL,
        device_id     VARCHAR(32) NOT NULL,
        air_temp      DOUBLE PRECISION,
        air_hum       DOUBLE PRECISION,
        nutrient_temp DOUBLE PRECISION,
        light         DOUBLE PRECISION,
        ph            DOUBLE PRECISION,
        recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (id, recorded_at)
      ) PARTITION BY RANGE (recorded_at)
    `);
  } else if (table === 'device_status') {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE device_status (
        id                    SERIAL,
        device_id             VARCHAR(32) NOT NULL,
        heater                BOOLEAN NOT NULL DEFAULT false,
        cooler                BOOLEAN NOT NULL DEFAULT false,
        mister                BOOLEAN NOT NULL DEFAULT false,
        pump                  BOOLEAN NOT NULL DEFAULT false,
        pid_enabled           BOOLEAN NOT NULL DEFAULT false,
        timer_mister_enabled  BOOLEAN NOT NULL DEFAULT false,
        target_temp_min       DOUBLE PRECISION NOT NULL DEFAULT 18,
        target_temp_max       DOUBLE PRECISION NOT NULL DEFAULT 22,
        recorded_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (id, recorded_at)
      ) PARTITION BY RANGE (recorded_at)
    `);
  }
  await prisma.$executeRawUnsafe(
    `CREATE TABLE ${table}_default PARTITION OF ${table} DEFAULT`
  );
}

async function ensureFuturePartitions(table: string) {
  const now = new Date();
  const startY = 2024;
  const endY = now.getFullYear() + 1;
  for (let y = startY; y <= endY; y++) {
    for (let m = 1; m <= 12; m++) {
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      const end = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
      const partName = `${table}_y${y}m${String(m).padStart(2, '0')}`;
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS ${partName} PARTITION OF ${table} ` +
          `FOR VALUES FROM ('${start}') TO ('${end}')`
      );
    }
  }
}

async function ensureIndexes() {
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_sensor_data_device_recorded ON sensor_data (device_id, recorded_at DESC)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_device_status_device_recorded ON device_status (device_id, recorded_at DESC)`
  );
}

/** 定时清理（默认每天执行一次，删除 N 天前的数据） */
export function startRetentionCron(intervalMs = 24 * 3600 * 1000) {
  const tick = async () => {
    try {
      const { pruneOldData } = await import('../services/sensorService.js');
      const result = await pruneOldData(RETENTION_DAYS);
      console.log(`[Retention] pruned`, result);
    } catch (err) {
      console.error('[Retention] failed', err);
    }
  };
  setTimeout(tick, 30_000);
  setInterval(tick, intervalMs);
}
