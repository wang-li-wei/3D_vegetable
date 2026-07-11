import mqtt from 'mqtt';
import { config } from '../utils/config.js';
import * as sensorService from './sensorService.js';
import * as alarmService from './alarmService.js';

let client: mqtt.MqttClient | null = null;

export function startMqtt() {
  client = mqtt.connect(config.mqttBroker);

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    client!.subscribe(config.mqttSubscribeTopic, (err) => {
      if (err) console.error('[MQTT] Subscribe error:', err);
      else console.log('[MQTT] Subscribed to', config.mqttSubscribeTopic);
    });
  });

  client.on('message', async (_topic, message) => {
    let payload: any;
    try {
      payload = JSON.parse(message.toString());
    } catch (err) {
      console.warn('[MQTT] Invalid JSON payload, dropping');
      return;
    }

    const deviceId =
      typeof payload?.device_id === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(payload.device_id)
        ? payload.device_id
        : 'esp32_01';

    // 1. 校验并归一化传感器数据（缺字段直接抛错，不入库、不报警）
    let sensor;
    try {
      sensor = sensorService.normalizeSensor(payload.data);
    } catch (err) {
      console.warn(`[MQTT] Bad sensor payload from ${deviceId}:`, (err as Error).message);
      return;
    }

    // 2. 设备状态（任意字段都可缺，但都强类型化为 boolean）
    const status = payload.status && typeof payload.status === 'object' ? payload.status : undefined;

    try {
      await sensorService.saveSensorAndStatus({ deviceId, sensor, status });
    } catch (err) {
      console.error(`[MQTT] DB write failed from ${deviceId}:`, err);
      return;
    }

    // 3. 边沿触发报警（去重 + cooldown + 自动 resolved）
    const sensorMap: Record<string, number> = {
      air_temp: sensor.airTemp,
      air_hum: sensor.airHum,
      nutrient_temp: sensor.nutrientTemp,
      light: sensor.light,
      ph: sensor.ph,
    };
    try {
      await alarmService.evaluateAlarms(sensorMap);
    } catch (err) {
      console.error('[MQTT] Alarm evaluation failed:', err);
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err);
  });

  client.on('close', () => {
    console.log('[MQTT] Disconnected');
  });
}

// 发送控制命令
export function publishCommand(command: Record<string, unknown>) {
  if (!client?.connected) {
    console.warn('[MQTT] Not connected, cannot publish');
    return false;
  }
  client.publish(config.mqttPublishTopic, JSON.stringify(command));
  return true;
}
