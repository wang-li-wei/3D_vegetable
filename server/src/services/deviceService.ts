import { prisma } from '../utils/prisma.js';

// 保存设备状态
export async function saveDeviceStatus(data: {
  deviceId: string;
  heater: boolean;
  cooler: boolean;
  mister: boolean;
  pump: boolean;
  pidEnabled: boolean;
  timerMisterEnabled: boolean;
  targetTempMin: number;
  targetTempMax: number;
}) {
  return prisma.deviceStatus.create({ data });
}

// 获取最新设备状态
export async function getLatestDeviceStatus() {
  const record = await prisma.deviceStatus.findFirst({
    orderBy: { recordedAt: 'desc' },
  });
  if (!record) return null;
  return {
    heater: record.heater,
    cooler: record.cooler,
    mister: record.mister,
    pump: record.pump,
    pid_enabled: record.pidEnabled,
    timer_mister_enabled: record.timerMisterEnabled,
    target_temp_min: record.targetTempMin,
    target_temp_max: record.targetTempMax,
  };
}
