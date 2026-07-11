import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { mqttService } from '@/mqtt/mqttService';
import { generateHistoryData } from '@/utils/simulator';
import type { SensorData, MqttMessage, AlarmRecord, DeviceStatus } from '@/types';
import { DEFAULT_THRESHOLDS, SENSOR_CONFIG } from '@/utils/constants';

type DeviceKey = 'heater' | 'cooler' | 'mister' | 'pump';

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

// 命令宽限期：6 秒内忽略 ESP32 对该设备的旧状态上报
const COMMAND_GRACE_MS = 6000;

export function useMqttData() {
  const autoControl = useAppStore((s) => s.autoControl);
  const thresholds = useAppStore((s) => s.thresholds);
  const updateSensorData = useAppStore((s) => s.updateSensorData);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const setAutoControl = useAppStore((s) => s.setAutoControl);
  const setTargetTempMin = useAppStore((s) => s.setTargetTempMin);
  const setTargetTempMax = useAppStore((s) => s.setTargetTempMax);
  const setConnected = useAppStore((s) => s.setConnected);
  const setOnlineDevices = useAppStore((s) => s.setOnlineDevices);
  const addAlarm = useAppStore((s) => s.addAlarm);
  const setHistoryData = useAppStore((s) => s.setHistoryData);

  // pendingCommands 从模块级全局变量改为 ref，避免 HMR / 多实例污染
  const pendingCommandsRef = useRef<Partial<Record<DeviceKey, { state: boolean; timestamp: number }>>>({});
  const seededRef = useRef(false);

  // 用 ref 存储最新值，避免 handleMessage 闭包陷阱
  const autoControlRef = useRef(autoControl);
  const thresholdsRef = useRef(thresholds);
  autoControlRef.current = autoControl;
  thresholdsRef.current = thresholds;

  const handleMessage = useCallback(
    (message: MqttMessage) => {
      setOnlineDevices(1, 1);
      updateSensorData(message.data);

      // 过滤掉宽限期内被命令覆盖的设备状态
      const now = Date.now();
      const filtered: Partial<DeviceStatus> = { ...message.status };
      for (const key of Object.keys(pendingCommandsRef.current) as DeviceKey[]) {
        const pending = pendingCommandsRef.current[key];
        if (!pending) continue;
        if (now - pending.timestamp > COMMAND_GRACE_MS) {
          delete pendingCommandsRef.current[key];
        } else if (key in filtered) {
          delete (filtered as Record<string, unknown>)[key];
        }
      }
      updateDeviceStatus(filtered);

      // 同步 ESP32 上报的控制模式
      if (message.status.pid_enabled !== undefined) {
        const espPid = message.status.pid_enabled as boolean;
        if (espPid !== autoControlRef.current.pidEnabled) {
          setAutoControl({ pidEnabled: espPid });
        }
      }
      if (message.status.timer_mister_enabled !== undefined) {
        const espTimer = message.status.timer_mister_enabled as boolean;
        if (espTimer !== autoControlRef.current.timerMisterEnabled) {
          setAutoControl({ timerMisterEnabled: espTimer });
        }
      }
      if (message.status.target_temp_min !== undefined) {
        setTargetTempMin(message.status.target_temp_min);
      }
      if (message.status.target_temp_max !== undefined) {
        setTargetTempMax(message.status.target_temp_max);
      }

      // 阈值检查
      const newAlarms = checkThresholds(message.data, thresholdsRef.current);
      newAlarms.forEach(addAlarm);

      // 追加历史数据（仅在收到真实数据后追加，不在初始化时灌 24h 模拟）
      for (const key of Object.keys(message.data) as (keyof SensorData)[]) {
        const prev = useAppStore.getState().historyData[key] || [];
        setHistoryData(key, [
          ...prev,
          { timestamp: now, value: message.data[key] },
        ].slice(-200));
      }
    },
    [updateSensorData, updateDeviceStatus, setAutoControl, setTargetTempMin, setTargetTempMax, setOnlineDevices, addAlarm, setHistoryData]
  );

  useEffect(() => {
    // 首次挂载：只灌 24h 模拟历史（用于 UI 占位），真实数据到来后追加
    if (!seededRef.current) {
      seededRef.current = true;
      for (const key of ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'] as (keyof SensorData)[]) {
        setHistoryData(key, generateHistoryData(key, 24));
      }
    }

    mqttService.connect();
    const unsubMessage = mqttService.onMessage(handleMessage);
    const unsubStatus = mqttService.onStatusChange((connected) => {
      setConnected(connected);
      if (!connected) setOnlineDevices(0, 0);
    });

    return () => {
      unsubMessage();
      unsubStatus();
      // 不在每次 effect 清理时 disconnect——这是单例，交给应用卸载处理
    };
  }, [handleMessage, setConnected, setOnlineDevices, setHistoryData]);
}

export function useControlCommand() {
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const addFarmLog = useAppStore((s) => s.addFarmLog);
  const pendingCommandsRef = useRef<Partial<Record<DeviceKey, { state: boolean; timestamp: number }>>>({});

  const sendCommand = useCallback(
    (device: DeviceKey, action: 'on' | 'off') => {
      const command = {
        device,
        action,
        timestamp: Math.floor(Date.now() / 1000),
      };

      // 记录命令，6秒内忽略 ESP32 对该设备的旧状态上报
      pendingCommandsRef.current[device] = { state: action === 'on', timestamp: Date.now() };

      updateDeviceStatus({ [device]: action === 'on' });
      mqttService.publishCommand(command);

      const deviceNames: Record<string, string> = {
        heater: '加热棒',
        cooler: '制冷片',
        mister: '雾化系统',
        pump: '水泵',
      };

      addFarmLog({
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'manual',
        content: `${action === 'on' ? '开启' : '关闭'}${deviceNames[device]}`,
      });
    },
    [updateDeviceStatus, addFarmLog]
  );

  const sendModeCommand = useCallback(
    (module: 'pid' | 'timer_mister', enabled: boolean) => {
      const command = {
        device: (module === 'pid' ? 'pid_control' : 'timer_mister') as 'pid_control' | 'timer_mister',
        action: (enabled ? 'on' : 'off') as 'on' | 'off',
        timestamp: Math.floor(Date.now() / 1000),
      };

      mqttService.publishCommand(command);

      const moduleName = module === 'pid' ? 'PID温度控制' : '定时雾化';
      addFarmLog({
        id: `log_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'manual',
        content: `${enabled ? '开启' : '关闭'}${moduleName}`,
      });
    },
    [addFarmLog]
  );

  return { sendCommand, sendModeCommand };
}
