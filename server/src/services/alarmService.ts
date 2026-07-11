import { prisma } from '../utils/prisma.js';

const COOLDOWN_MS = 5 * 60 * 1000; // 同参 5 分钟内不重复发报警

export async function createAlarm(data: {
  parameter: string;
  value: number;
  threshold: number;
  type: string;
  message: string;
}) {
  return prisma.alarm.create({ data });
}

/**
 * 边沿触发报警检查。
 *  - 同一参数已有 active 报警 → 跳过（去重）
 *  - 5 分钟内同参同 type → 跳过（cooldown）
 *  - 参数从越界恢复到正常 → 关闭上一条 active，写 resolved
 *  - 越界且无 active → 新建
 */
export async function evaluateAlarms(sensorMap: Record<string, number>) {
  // 读取阈值（依赖注入式不优雅，这里直接用 service）
  const { getThresholds } = await import('./thresholdService.js');
  const thresholds = await getThresholds();

  // 1. 取出所有当前 active 报警
  const activeAlarms = await prisma.alarm.findMany({
    where: { status: 'active' },
  });
  const activeByParam = new Map(activeAlarms.map((a) => [a.parameter, a]));

  const now = Date.now();
  const toCreate: Array<{
    parameter: string;
    value: number;
    threshold: number;
    type: string;
    message: string;
  }> = [];
  const toResolveIds: number[] = [];

  for (const [param, range] of Object.entries(thresholds)) {
    const value = sensorMap[param];
    if (value === undefined || !Number.isFinite(value)) continue;

    const existing = activeByParam.get(param);
    const outOfRange = value > range.max ? 'high' : value < range.min ? 'low' : null;

    if (outOfRange === null) {
      // 已回到正常范围：关闭 active
      if (existing) toResolveIds.push(existing.id);
      continue;
    }

    if (existing) {
      // 已有 active：仅在类型翻转（high↔low）时刷新 cooldown 起点
      if (existing.type !== outOfRange) {
        const ageMs = now - existing.createdAt.getTime();
        if (ageMs > COOLDOWN_MS) {
          // 把旧的 resolved，重新开一条
          toResolveIds.push(existing.id);
          toCreate.push(buildAlarm(param, value, range, outOfRange));
        }
      }
      continue;
    }

    // 没有 active：检查同 type 的最近一条是否在 cooldown 内
    const lastOfType = await prisma.alarm.findFirst({
      where: { parameter: param, type: outOfRange },
      orderBy: { createdAt: 'desc' },
    });
    if (lastOfType && now - lastOfType.createdAt.getTime() < COOLDOWN_MS) continue;

    toCreate.push(buildAlarm(param, value, range, outOfRange));
  }

  if (toResolveIds.length > 0) {
    await prisma.alarm.updateMany({
      where: { id: { in: toResolveIds } },
      data: { status: 'resolved' },
    });
  }
  if (toCreate.length > 0) {
    await prisma.alarm.createMany({ data: toCreate });
  }
  return { created: toCreate.length, resolved: toResolveIds.length };
}

function buildAlarm(
  param: string,
  value: number,
  range: { min: number; max: number },
  type: 'high' | 'low'
) {
  const threshold = type === 'high' ? range.max : range.min;
  const op = type === 'high' ? '>' : '<';
  return {
    parameter: param,
    value,
    threshold,
    type,
    message: `${param} ${type === 'high' ? '超出上限' : '低于下限'}阈值: ${value} ${op} ${threshold}`,
  };
}

export async function getAlarms(params: { status?: string; limit?: number }) {
  const { status, limit = 50 } = params;
  return prisma.alarm.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function updateAlarmStatus(id: number, status: string) {
  return prisma.alarm.update({ where: { id }, data: { status } });
}

export async function markAllAlarmsRead() {
  return prisma.alarm.updateMany({
    where: { status: 'active' },
    data: { status: 'read' },
  });
}

export async function getActiveAlarmCount() {
  return prisma.alarm.count({ where: { status: 'active' } });
}
