import { prisma } from '../utils/prisma.js';

// 获取系统配置
export async function getSystemConfig(key: string) {
  const record = await prisma.systemConfig.findUnique({ where: { key } });
  return record?.value ?? null;
}

// 设置系统配置
export async function setSystemConfig(key: string, value: string) {
  return prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// 获取所有系统配置
export async function getAllSystemConfig() {
  const records = await prisma.systemConfig.findMany();
  const result: Record<string, string> = {};
  for (const r of records) {
    result[r.key] = r.value;
  }
  return result;
}
