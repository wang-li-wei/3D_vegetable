import type { ThresholdConfig, SensorDisplayConfig } from '@/types';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  air_temp: { min: 15, max: 30 },
  air_hum: { min: 50, max: 85 },
  nutrient_temp: { min: 18, max: 22 },
  light: { min: 200, max: 800 },
  ph: { min: 5.5, max: 6.5 },
};

export const SENSOR_CONFIG: SensorDisplayConfig[] = [
  { key: 'air_temp', label: '环境温度', unit: '℃', icon: '🌡️', decimals: 1 },
  { key: 'air_hum', label: '环境湿度', unit: '%', icon: '💧', decimals: 1 },
  { key: 'nutrient_temp', label: '营养液温度', unit: '℃', icon: '🧪', decimals: 1 },
  { key: 'light', label: '光照强度', unit: 'lux', icon: '☀️', decimals: 0 },
  { key: 'ph', label: '营养液pH', unit: '', icon: '⚗️', decimals: 1 },
];

export const MQTT_CONFIG = {
  defaultBroker: 'ws://localhost:8083/mqtt',
  subscribeTopic: '/lettuce/sensor/data',
  publishTopic: '/lettuce/control/command',
  statusTopic: '/lettuce/device/status',
};

export const GROWTH_STAGES = {
  seedling: { label: '幼苗期', daysRange: [1, 14], color: '#73d13d' },
  growing: { label: '生长期', daysRange: [15, 35], color: '#52c41a' },
  harvest: { label: '收获期', daysRange: [36, 45], color: '#389e0d' },
};

export const GREENHOUSE_DIMENSIONS = {
  length: 10,
  width: 6,
  height: 3,
  shelfLayers: 3,
  holesPerLayer: 10,
};

export const PID_CONFIG = {
  targetTemp: 20,
  kp: 2.0,
  ki: 0.1,
  kd: 1.0,
  tempRange: { min: 18, max: 22 },
};
