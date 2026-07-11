import { prisma } from '../utils/prisma.js';

// 创建农事日志
export async function createFarmLog(data: { type: string; content: string }) {
  return prisma.farmLog.create({ data });
}

// 查询农事日志
export async function getFarmLogs(params: { limit?: number }) {
  const { limit = 50 } = params;
  return prisma.farmLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
