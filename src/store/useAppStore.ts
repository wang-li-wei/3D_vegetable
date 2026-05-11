import { create } from 'zustand';
import type {
  SensorData,
  DeviceStatus,
  ThresholdConfig,
  AlarmRecord,
  GrowthStage,
  GrowthRecord,
  FarmLog,
  AutoControlMode,
  MisterTimerConfig,
  HistoryDataPoint,
} from '@/types';
import { DEFAULT_THRESHOLDS } from '@/utils/constants';

interface SystemState {
  connected: boolean;
  simulationMode: boolean;
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
  autoControlMode: AutoControlMode;
  misterTimer: MisterTimerConfig;
  historyData: Record<keyof SensorData, HistoryDataPoint[]>;
  selectedSensor: keyof SensorData | null;
  selectedDevice: string | null;

  setConnected: (connected: boolean) => void;
  setSimulationMode: (mode: boolean) => void;
  setOnlineDevices: (online: number, total: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  updateSensorData: (data: Partial<SensorData>) => void;
  updateDeviceStatus: (status: Partial<DeviceStatus>) => void;
  setThresholds: (thresholds: Partial<ThresholdConfig>) => void;
  addAlarm: (alarm: AlarmRecord) => void;
  updateAlarmStatus: (id: string, status: AlarmRecord['status']) => void;
  clearAlarms: () => void;
  setGrowthStage: (stage: GrowthStage) => void;
  setGrowthDay: (day: number) => void;
  setPlantingDate: (date: string) => void;
  addGrowthRecord: (record: GrowthRecord) => void;
  addFarmLog: (log: FarmLog) => void;
  setAutoControlMode: (mode: AutoControlMode) => void;
  setMisterTimer: (config: Partial<MisterTimerConfig>) => void;
  setHistoryData: (key: keyof SensorData, data: HistoryDataPoint[]) => void;
  setSelectedSensor: (key: keyof SensorData | null) => void;
  setSelectedDevice: (device: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  system: {
    connected: false,
    simulationMode: true,
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
  },
  thresholds: { ...DEFAULT_THRESHOLDS },
  alarms: [],
  growthStage: 'growing',
  growthDay: 20,
  plantingDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
  growthRecords: [],
  farmLogs: [],
  autoControlMode: 'off',
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
  setSimulationMode: (mode) =>
    set((s) => ({ system: { ...s.system, simulationMode: mode } })),
  setOnlineDevices: (online, total) =>
    set((s) => ({ system: { ...s.system, onlineDevices: online, totalDevices: total } })),
  setSoundEnabled: (enabled) =>
    set((s) => ({ system: { ...s.system, soundEnabled: enabled } })),
  updateSensorData: (data) =>
    set((s) => ({ sensorData: { ...s.sensorData, ...data } })),
  updateDeviceStatus: (status) =>
    set((s) => ({ deviceStatus: { ...s.deviceStatus, ...status } })),
  setThresholds: (thresholds) =>
    set((s) => ({ thresholds: { ...s.thresholds, ...thresholds } })),
  addAlarm: (alarm) =>
    set((s) => ({ alarms: [alarm, ...s.alarms].slice(0, 100) })),
  updateAlarmStatus: (id, status) =>
    set((s) => ({
      alarms: s.alarms.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  clearAlarms: () => set({ alarms: [] }),
  setGrowthStage: (stage) => set({ growthStage: stage }),
  setGrowthDay: (day) => set({ growthDay: day }),
  setPlantingDate: (date) => set({ plantingDate: date }),
  addGrowthRecord: (record) =>
    set((s) => ({ growthRecords: [...s.growthRecords, record] })),
  addFarmLog: (log) =>
    set((s) => ({ farmLogs: [log, ...s.farmLogs].slice(0, 200) })),
  setAutoControlMode: (mode) => set({ autoControlMode: mode }),
  setMisterTimer: (config) =>
    set((s) => ({ misterTimer: { ...s.misterTimer, ...config } })),
  setHistoryData: (key, data) =>
    set((s) => ({
      historyData: { ...s.historyData, [key]: data },
    })),
  setSelectedSensor: (key) => set({ selectedSensor: key }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
}));
