import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { mqttService } from '@/mqtt/mqttService';
import { generateSimMessage, generateHistoryData } from '@/utils/simulator';
import type { SensorData, MqttMessage, AlarmRecord } from '@/types';
import { DEFAULT_THRESHOLDS, SENSOR_CONFIG } from '@/utils/constants';

function checkThresholds(
  data: SensorData,
  thresholds: typeof DEFAULT_THRESHOLDS
): AlarmRecord[] {
  const alarms: AlarmRecord[] = [];
  const now = Date.now();

  for (const config of SENSOR_CONFIG) {
    const value = data[config.key];
    const threshold = thresholds[config.key];
    if (value > threshold.max) {
      alarms.push({
        id: `${config.key}_high_${now}`,
        timestamp: now,
        parameter: config.key,
        value,
        threshold: threshold.max,
        type: 'high',
        status: 'active',
        message: `${config.label}(${value}${config.unit})超过上限${threshold.max}${config.unit}`,
      });
    } else if (value < threshold.min) {
      alarms.push({
        id: `${config.key}_low_${now}`,
        timestamp: now,
        parameter: config.key,
        value,
        threshold: threshold.min,
        type: 'low',
        status: 'active',
        message: `${config.label}(${value}${config.unit})低于下限${threshold.min}${config.unit}`,
      });
    }
  }

  return alarms;
}

export function useMqttData() {
  const simulationMode = useAppStore((s) => s.system.simulationMode);
  const thresholds = useAppStore((s) => s.thresholds);
  const updateSensorData = useAppStore((s) => s.updateSensorData);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const setConnected = useAppStore((s) => s.setConnected);
  const setOnlineDevices = useAppStore((s) => s.setOnlineDevices);
  const addAlarm = useAppStore((s) => s.addAlarm);
  const setHistoryData = useAppStore((s) => s.setHistoryData);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMessage = useCallback(
    (message: MqttMessage) => {
      updateSensorData(message.data);
      updateDeviceStatus(message.status);

      const newAlarms = checkThresholds(message.data, thresholds);
      newAlarms.forEach(addAlarm);

      const now = Date.now();
      for (const key of Object.keys(message.data) as (keyof SensorData)[]) {
        setHistoryData(key, [
          { timestamp: now, value: message.data[key] },
        ]);
      }
    },
    [updateSensorData, updateDeviceStatus, thresholds, addAlarm, setHistoryData]
  );

  useEffect(() => {
    if (simulationMode) {
      simTimerRef.current = setInterval(() => {
        const msg = generateSimMessage();
        handleMessage(msg);
        setConnected(true);
        setOnlineDevices(1, 1);
      }, 2000);

      for (const key of ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'] as (keyof SensorData)[]) {
        setHistoryData(key, generateHistoryData(key, 24));
      }

      return () => {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
      };
    } else {
      mqttService.connect();
      const unsubMessage = mqttService.onMessage(handleMessage);
      const unsubStatus = mqttService.onStatusChange((connected) => {
        setConnected(connected);
        if (connected) setOnlineDevices(1, 1);
        else setOnlineDevices(0, 1);
      });

      for (const key of ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'] as (keyof SensorData)[]) {
        setHistoryData(key, generateHistoryData(key, 24));
      }

      return () => {
        unsubMessage();
        unsubStatus();
        mqttService.disconnect();
      };
    }
  }, [simulationMode, handleMessage, setConnected, setOnlineDevices, setHistoryData]);
}

export function useControlCommand() {
  const simulationMode = useAppStore((s) => s.system.simulationMode);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const addFarmLog = useAppStore((s) => s.addFarmLog);

  const sendCommand = useCallback(
    (device: 'heater' | 'cooler' | 'mister', action: 'on' | 'off') => {
      const command = {
        device,
        action,
        timestamp: Math.floor(Date.now() / 1000),
      };

      if (simulationMode) {
        updateDeviceStatus({ [device]: action === 'on' });
      } else {
        mqttService.publishCommand(command);
      }

      const deviceNames: Record<string, string> = {
        heater: '加热棒',
        cooler: '制冷片',
        mister: '雾化系统',
      };

      addFarmLog({
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'manual',
        content: `${action === 'on' ? '开启' : '关闭'}${deviceNames[device]}`,
      });
    },
    [simulationMode, updateDeviceStatus, addFarmLog]
  );

  return { sendCommand };
}
