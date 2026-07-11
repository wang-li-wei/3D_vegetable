import { create } from 'zustand';
import type {
  SensorData,
  DeviceStatus,
  ThresholdConfig,
  AlarmRecord,
  GrowthStage,
  GrowthRecord,
  FarmLog,
  AutoControlState,
  MisterTimerConfig,
  HistoryDataPoint,
} from '@/types';
import { DEFAULT_THRESHOLDS } from '@/utils/constants';
import { thresholdApi } from '@/services/api';

const THRESHOLD_STORAGE_KEY = '3d_vegetable_thresholds';

function loadThresholds(): ThresholdConfig {
  try {
    const saved = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (saved) return { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_THRESHOLDS };
}

function saveThresholdsLocal(thresholds: ThresholdConfig) {
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(thresholds));
  } catch { /* ignore */ }
}

interface SystemState {
  connected: boolean;
  onlineDevices: number;
  totalDevices: number;
  soundEnabled: boolean;
}

interface AppStore {
  system: SystemState;
  sensorData: SensorData;
  deviceStatus: DeviceStatus;
  thresholds: ThresholdConfig;
  alarms: AlarmRecord[];
  growthStage: GrowthStage;
  growthDay: number;
  plantingDate: string;
  growthRecords: GrowthRecord[];
  farmLogs: FarmLog[];
  autoControl: AutoControlState;
  targetTempMin: number;
  targetTempMax: number;
  misterTimer: MisterTimerConfig;
  historyData: Record<keyof SensorData, HistoryDataPoint[]>;
  selectedSensor: keyof SensorData | null;
  selectedDevice: string | null;

  setConnected: (connected: boolean) => void;
  setOnlineDevices: (online: number, total: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateSensorData: (data: Partial<SensorData>) => void;
  updateDeviceStatus: (status: Partial<DeviceStatus>) => void;
  setThresholds: (thresholds: Partial<ThresholdConfig>) => void;
  addAlarm: (alarm: AlarmRecord) => void;
  updateAlarmStatus: (id: string, status: AlarmRecord['status']) => void;
  markAllAlarmsRead: () => void;
  clearAlarms: () => void;
  setGrowthStage: (stage: GrowthStage) => void;
  setGrowthDay: (day: number) => void;
  setPlantingDate: (date: string) => void;
  addGrowthRecord: (record: GrowthRecord) => void;
  addFarmLog: (log: FarmLog) => void;
  setAutoControl: (state: Partial<AutoControlState>) => void;
  setTargetTempMin: (temp: number) => void;
  setTargetTempMax: (temp: number) => void;
  setMisterTimer: (config: Partial<MisterTimerConfig>) => void;
  setHistoryData: (key: keyof SensorData, data: HistoryDataPoint[]) => void;
  setSelectedSensor: (key: keyof SensorData | null) => void;
  setSelectedDevice: (device: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  system: {
    connected: false,
    onlineDevices: 0,
    totalDevices: 1,
    soundEnabled: true,
  },
  sensorData: {
    air_temp: 0,
    air_hum: 0,
    nutrient_temp: 0,
    light: 0,
    ph: 0,
  },
  deviceStatus: {
    heater: false,
    cooler: false,
    mister: false,
    pump: false,
  },
  thresholds: loadThresholds(),
  alarms: [],
  growthStage: 'growing',
  growthDay: 20,
  plantingDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
  growthRecords: [],
  farmLogs: [],
  autoControl: { pidEnabled: false, timerMisterEnabled: false },
  targetTempMin: 18,
  targetTempMax: 22,
  misterTimer: {
    intervalMinutes: 30,
    durationMinutes: 5,
  },
  historyData: {
    air_temp: [],
    air_hum: [],
    nutrient_temp: [],
    light: [],
    ph: [],
  },
  selectedSensor: null,
  selectedDevice: null,

  setConnected: (connected) =>
    set((s) => ({ system: { ...s.system, connected } })),
  setOnlineDevices: (online, total) =>
    set((s) => ({ system: { ...s.system, onlineDevices: online, totalDevices: total } })),
  setSoundEnabled: (enabled) =>
    set((s) => ({ system: { ...s.system, soundEnabled: enabled } })),
  updateSensorData: (data) =>
    set((s) => ({ sensorData: { ...s.sensorData, ...data } })),
  updateDeviceStatus: (status) =>
    set((s) => ({ deviceStatus: { ...s.deviceStatus, ...status } })),
  setThresholds: (thresholds) =>
    set((s) => {
      const updated = { ...s.thresholds, ...thresholds };
      // 本地持久化（后端不可用时的 fallback）
      saveThresholdsLocal(updated);
      // 并行同步到后端，不阻塞 UI
      const promises: Promise<unknown>[] = [];
      for (const [key, val] of Object.entries(thresholds)) {
        if (val && typeof val === 'object' && 'min' in val && 'max' in val) {
          promises.push(
            thresholdApi
              .update(key, (val as { min: number; max: number }).min, (val as { min: number; max: number }).max)
              .catch(() => {})
          );
        }
      }
      void Promise.all(promises);
      return { thresholds: updated };
    }),
  addAlarm: (alarm) =>
    set((s) => ({ alarms: [alarm, ...s.alarms].slice(0, 100) })),
  updateAlarmStatus: (id, status) =>
    set((s) => ({
      alarms: s.alarms.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  markAllAlarmsRead: () =>
    set((s) => ({
      alarms: s.alarms.map((a) => (a.status === 'active' ? { ...a, status: 'read' as const } : a)),
    })),
  clearAlarms: () => set({ alarms: [] }),
  setGrowthStage: (stage) => set({ growthStage: stage }),
  setGrowthDay: (day) => set({ growthDay: day }),
  setPlantingDate: (date) => set({ plantingDate: date }),
  addGrowthRecord: (record) =>
    set((s) => ({ growthRecords: [...s.growthRecords, record] })),
  addFarmLog: (log) =>
    set((s) => ({ farmLogs: [log, ...s.farmLogs].slice(0, 200) })),
  setAutoControl: (state) =>
    set((s) => ({ autoControl: { ...s.autoControl, ...state } })),
  setTargetTempMin: (temp) => set({ targetTempMin: temp }),
  setTargetTempMax: (temp) => set({ targetTempMax: temp }),
  setMisterTimer: (config) =>
    set((s) => ({ misterTimer: { ...s.misterTimer, ...config } })),
  setHistoryData: (key, data) =>
    set((s) => ({
      historyData: { ...s.historyData, [key]: data },
    })),
  setSelectedSensor: (key) => set({ selectedSensor: key }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
}));
