import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 插入默认阈值
  const defaults = [
    { parameter: 'air_temp', minVal: 15, maxVal: 30 },
    { parameter: 'air_hum', minVal: 50, maxVal: 85 },
    { parameter: 'nutrient_temp', minVal: 18, maxVal: 22 },
    { parameter: 'light', minVal: 200, maxVal: 800 },
    { parameter: 'ph', minVal: 5.5, maxVal: 6.5 },
  ];

  for (const t of defaults) {
    await prisma.thresholdConfig.upsert({
      where: { parameter: t.parameter },
      update: {},
      create: t,
    });
  }

  // 插入默认系统配置
  const sysDefaults = [
    { key: 'growth_stage', value: 'growing' },
    { key: 'growth_day', value: '20' },
    { key: 'planting_date', value: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0] },
    { key: 'target_temp_min', value: '18' },
    { key: 'target_temp_max', value: '22' },
    { key: 'mister_interval_minutes', value: '30' },
    { key: 'mister_duration_minutes', value: '5' },
  ];

  for (const s of sysDefaults) {
    await prisma.systemConfig.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('Seed data inserted');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
