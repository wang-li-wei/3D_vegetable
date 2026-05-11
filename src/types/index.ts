export interface SensorData {
  air_temp: number;
  air_hum: number;
  nutrient_temp: number;
  light: number;
  ph: number;
}

export interface DeviceStatus {
  heater: boolean;
  cooler: boolean;
  mister: boolean;
}

export interface MqttMessage {
  device_id: string;
  timestamp: number;
  data: SensorData;
  status: DeviceStatus;
}

export interface ControlCommand {
  device: 'heater' | 'cooler' | 'mister';
  action: 'on' | 'off';
  timestamp: number;
}

export interface ThresholdConfig {
  air_temp: { min: number; max: number };
  air_hum: { min: number; max: number };
  nutrient_temp: { min: number; max: number };
  light: { min: number; max: number };
  ph: { min: number; max: number };
}

export type GrowthStage = 'seedling' | 'growing' | 'harvest';

export interface GrowthRecord {
  date: string;
  stage: GrowthStage;
  day: number;
  accumulatedTemp: number;
  estimatedWeight: number;
  envData: SensorData;
}

export interface FarmLog {
  id: string;
  date: string;
  type: 'auto' | 'manual';
  content: string;
}

export interface AlarmRecord {
  id: string;
  timestamp: number;
  parameter: string;
  value: number;
  threshold: number;
  type: 'high' | 'low';
  status: 'active' | 'ignored' | 'resolved';
  message: string;
}

export interface HistoryDataPoint {
  timestamp: number;
  value: number;
}

export type AutoControlMode = 'off' | 'pid_temp' | 'timer_mister';

export interface MisterTimerConfig {
  intervalMinutes: number;
  durationMinutes: number;
}

export interface DailyStats {
  date: string;
  avgAirTemp: number;
  avgAirHum: number;
  avgNutrientTemp: number;
  avgLight: number;
  avgPh: number;
  heaterHours: number;
  coolerHours: number;
  misterHours: number;
}

export interface SensorDisplayConfig {
  key: keyof SensorData;
  label: string;
  unit: string;
  icon: string;
  decimals: number;
}
