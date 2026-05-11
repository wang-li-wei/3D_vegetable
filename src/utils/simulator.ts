import type { SensorData, DeviceStatus, MqttMessage } from '@/types';

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateSimSensorData(): SensorData {
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour <= 18;

  return {
    air_temp: parseFloat(randomInRange(isDaytime ? 22 : 16, isDaytime ? 30 : 22).toFixed(1)),
    air_hum: parseFloat(randomInRange(55, 80).toFixed(1)),
    nutrient_temp: parseFloat(randomInRange(18, 22).toFixed(1)),
    light: parseFloat(randomInRange(isDaytime ? 300 : 0, isDaytime ? 800 : 50).toFixed(0)),
    ph: parseFloat(randomInRange(5.8, 6.4).toFixed(1)),
  };
}

export function generateSimDeviceStatus(): DeviceStatus {
  return {
    heater: Math.random() > 0.7,
    cooler: Math.random() > 0.8,
    mister: Math.random() > 0.5,
  };
}

export function generateSimMessage(): MqttMessage {
  return {
    device_id: 'esp32_001',
    timestamp: Math.floor(Date.now() / 1000),
    data: generateSimSensorData(),
    status: generateSimDeviceStatus(),
  };
}

export function generateHistoryData(
  parameter: keyof SensorData,
  hours: number = 24
): Array<{ timestamp: number; value: number }> {
  const now = Date.now();
  const points: Array<{ timestamp: number; value: number }> = [];
  const ranges: Record<keyof SensorData, [number, number]> = {
    air_temp: [16, 30],
    air_hum: [50, 85],
    nutrient_temp: [18, 22],
    light: [0, 800],
    ph: [5.5, 6.5],
  };

  const [min, max] = ranges[parameter];

  for (let i = hours * 4; i >= 0; i--) {
    const timestamp = now - i * 15 * 60 * 1000;
    const hour = new Date(timestamp).getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    let value = randomInRange(min, max);

    if (parameter === 'light') {
      value = isDaytime ? randomInRange(300, 800) : randomInRange(0, 50);
    } else if (parameter === 'air_temp') {
      value = isDaytime ? randomInRange(22, 30) : randomInRange(16, 22);
    }

    points.push({
      timestamp,
      value: parseFloat(value.toFixed(parameter === 'light' ? 0 : 1)),
    });
  }

  return points;
}

export function generateDailyStats(days: number = 30) {
  const stats = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    stats.push({
      date: date.toISOString().split('T')[0],
      avgAirTemp: parseFloat(randomInRange(18, 28).toFixed(1)),
      avgAirHum: parseFloat(randomInRange(55, 75).toFixed(1)),
      avgNutrientTemp: parseFloat(randomInRange(18, 22).toFixed(1)),
      avgLight: parseFloat(randomInRange(200, 600).toFixed(0)),
      avgPh: parseFloat(randomInRange(5.8, 6.4).toFixed(1)),
      heaterHours: parseFloat(randomInRange(0, 4).toFixed(1)),
      coolerHours: parseFloat(randomInRange(0, 3).toFixed(1)),
      misterHours: parseFloat(randomInRange(2, 6).toFixed(1)),
    });
  }
  return stats;
}
