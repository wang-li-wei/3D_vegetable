import { prisma } from '../utils/prisma.js';

// 获取所有阈值
export async function getThresholds() {
  const records = await prisma.thresholdConfig.findMany();
  const result: Record<string, { min: number; max: number }> = {};
  for (const r of records) {
    result[r.parameter] = { min: r.minVal, max: r.maxVal };
  }
  return result;
}

// 更新阈值
export async function updateThreshold(parameter: string, min: number, max: number) {
  return prisma.thresholdConfig.upsert({
    where: { parameter },
    update: { minVal: min, maxVal: max },
    create: { parameter, minVal: min, maxVal: max },
  });
}
