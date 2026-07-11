import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { thresholdApi, configApi } from '@/services/api';

// 模块级单次加载守卫：避免 React 18 StrictMode 双调用 / HMR 多次初始化
let dataSyncInitialized = false;

export function useDataSync() {
  const setThresholds = useAppStore((s) => s.setThresholds);
  const setGrowthStage = useAppStore((s) => s.setGrowthStage);
  const setGrowthDay = useAppStore((s) => s.setGrowthDay);
  const setPlantingDate = useAppStore((s) => s.setPlantingDate);

  useEffect(() => {
    if (dataSyncInitialized) return;
    dataSyncInitialized = true;

    // 从后端加载阈值
    thresholdApi.get().then((data) => {
      if (data && Object.keys(data).length > 0) {
        setThresholds(data as Parameters<typeof setThresholds>[0]);
      }
    }).catch(() => {
      console.warn('[DataSync] Failed to load thresholds from server');
    });

    // 从后端加载系统配置
    configApi.getAll().then((data) => {
      if (data.growth_stage) setGrowthStage(data.growth_stage as 'seedling' | 'growing' | 'harvest');
      if (data.growth_day) setGrowthDay(parseInt(data.growth_day, 10));
      if (data.planting_date) setPlantingDate(data.planting_date);
    }).catch(() => {
      console.warn('[DataSync] Failed to load system config from server');
    });
  }, [setThresholds, setGrowthStage, setGrowthDay, setPlantingDate]);
}
