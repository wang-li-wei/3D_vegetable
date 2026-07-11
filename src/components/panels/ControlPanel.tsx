import { useEffect, useRef, useCallback } from 'react';
import { Switch, InputNumber, message } from 'antd';
import {
  ThunderboltOutlined,
  SettingOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { useControlCommand } from '@/hooks/useMqttData';
import { mqttService } from '@/mqtt/mqttService';

function DeviceControl({
  label,
  device,
  active,
  icon,
  disabled,
}: {
  label: string;
  device: 'heater' | 'cooler' | 'mister' | 'pump';
  active: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const { sendCommand } = useControlCommand();

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '10px 0',
        borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <span style={{ color: '#00E5FF', fontSize: 14, display: 'flex', alignItems: 'center', lineHeight: 1 }}>{icon}</span>
        <span style={{ color: '#B0C8E0', fontWeight: 500, fontSize: 13, lineHeight: '20px' }}>
          {label}
        </span>
      </div>
      <div className="flex items-center" style={{ gap: 8 }}>
        <span
          className="glass-tag"
          style={{
            background: active
              ? 'rgba(0, 229, 255, 0.12)'
              : 'rgba(8, 24, 58, 0.50)',
            borderColor: active
              ? 'rgba(0, 229, 255, 0.30)'
              : 'rgba(0, 229, 255, 0.08)',
            color: active ? '#00E5FF' : 'rgba(176, 200, 224, 0.35)',
            fontSize: 10,
            padding: '2px 8px',
            lineHeight: '16px',
          }}
        >
          {active ? '运行中' : '已停止'}
        </span>
        <Switch
          checked={active}
          onChange={(checked) => {
            if (disabled) {
              message.warning('请先关闭自动控制再手动操作设备');
              return;
            }
            sendCommand(device, checked ? 'on' : 'off');
          }}
          checkedChildren="开"
          unCheckedChildren="关"
          style={{ fontWeight: 600 }}
        />
      </div>
    </div>
  );
}

function PIDControlModule() {
  const pidEnabled = useAppStore((s) => s.autoControl.pidEnabled);
  const setAutoControl = useAppStore((s) => s.setAutoControl);
  const targetTempMin = useAppStore((s) => s.targetTempMin);
  const targetTempMax = useAppStore((s) => s.targetTempMax);
  const setTargetTempMin = useAppStore((s) => s.setTargetTempMin);
  const setTargetTempMax = useAppStore((s) => s.setTargetTempMax);
  const sensorData = useAppStore((s) => s.sensorData);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const { sendModeCommand, sendCommand } = useControlCommand();
  const pidIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pidStateRef = useRef({ integral: 0, lastError: 0 });
  const prevDeviceState = useRef({ heater: false, cooler: false });

  // 用 ref 存储最新值，避免闭包陷阱
  const targetTempMinRef = useRef(targetTempMin);
  const targetTempMaxRef = useRef(targetTempMax);
  const sensorDataRef = useRef(sensorData);
  const updateDeviceStatusRef = useRef(updateDeviceStatus);
  const sendCommandRef = useRef(sendCommand);

  targetTempMinRef.current = targetTempMin;
  targetTempMaxRef.current = targetTempMax;
  sensorDataRef.current = sensorData;
  updateDeviceStatusRef.current = updateDeviceStatus;
  sendCommandRef.current = sendCommand;

  const runPIDControl = useCallback(() => {
    const min = targetTempMinRef.current;
    const max = targetTempMaxRef.current;
    const targetTemp = (min + max) / 2;
    const nutrientTemp = sensorDataRef.current.nutrient_temp;
    const error = targetTemp - nutrientTemp;
    pidStateRef.current.integral += error;
    const derivative = error - pidStateRef.current.lastError;
    pidStateRef.current.lastError = error;

    const output =
      2.0 * error + 0.1 * pidStateRef.current.integral + 1.0 * derivative;

    let heater = false, cooler = false;
    if (output > 0.5) {
      heater = true;
    } else if (output < -0.5) {
      cooler = true;
    }

    updateDeviceStatusRef.current({ heater, cooler });

    if (heater !== prevDeviceState.current.heater) {
      sendCommandRef.current('heater', heater ? 'on' : 'off');
      prevDeviceState.current.heater = heater;
    }
    if (cooler !== prevDeviceState.current.cooler) {
      sendCommandRef.current('cooler', cooler ? 'on' : 'off');
      prevDeviceState.current.cooler = cooler;
    }
  }, []);

  useEffect(() => {
    if (pidIntervalRef.current) {
      clearInterval(pidIntervalRef.current);
      pidIntervalRef.current = null;
    }

    if (pidEnabled) {
      pidStateRef.current = { integral: 0, lastError: 0 };
      runPIDControl();
      pidIntervalRef.current = setInterval(runPIDControl, 5000);
    } else {
      // 关闭 PID 时通知 ESP32 关闭加热棒和制冷片
      if (prevDeviceState.current.heater) {
        sendCommand('heater', 'off');
      }
      if (prevDeviceState.current.cooler) {
        sendCommand('cooler', 'off');
      }
      updateDeviceStatus({ heater: false, cooler: false });
      prevDeviceState.current = { heater: false, cooler: false };
    }

    return () => {
      if (pidIntervalRef.current) clearInterval(pidIntervalRef.current);
    };
  }, [pidEnabled]); // 只依赖 pidEnabled，不再依赖 runPIDControl

  const handleToggle = (checked: boolean) => {
    setAutoControl({ pidEnabled: checked });
    sendModeCommand('pid', checked);
  };

  const publishTempRange = (min: number, max: number) => {
    mqttService.publishCommand({
      device: 'target_temp',
      action: 'set',
      value: min,
      timestamp: Math.floor(Date.now() / 1000),
    });
    mqttService.publishCommand({
      device: 'target_temp_max',
      action: 'set',
      value: max,
      timestamp: Math.floor(Date.now() / 1000),
    });
  };

  return (
    <div
      className="glass-card mb-3"
      style={{ padding: '4px 16px' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 0', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <RobotOutlined style={{ color: '#00E5FF', fontSize: 13, display: 'flex', alignItems: 'center' }} />
          <span className="glass-title" style={{ fontSize: 12, lineHeight: '18px' }}>PID温度控制</span>
        </div>
        <Switch
          checked={pidEnabled}
          onChange={handleToggle}
          checkedChildren="开"
          unCheckedChildren="关"
          style={{ fontWeight: 600 }}
        />
      </div>

      {pidEnabled && (
        <div style={{ padding: '8px 0 12px' }}>
          <div className="flex items-center justify-between">
            <span className="glass-label">温度下限</span>
            <InputNumber
              size="small"
              min={10}
              max={targetTempMax}
              step={0.5}
              value={targetTempMin}
              onChange={(v) => {
                if (v !== null && v < targetTempMax) {
                  setTargetTempMin(v);
                  publishTempRange(v, targetTempMax);
                }
              }}
              style={{ width: 80 }}
              className="glass-input"
              suffix="℃"
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="glass-label">温度上限</span>
            <InputNumber
              size="small"
              min={targetTempMin}
              max={35}
              step={0.5}
              value={targetTempMax}
              onChange={(v) => {
                if (v !== null && v > targetTempMin) {
                  setTargetTempMax(v);
                  publishTempRange(targetTempMin, v);
                }
              }}
              style={{ width: 80 }}
              className="glass-input"
              suffix="℃"
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="glass-label">当前温度</span>
            <span style={{ color: '#00E5FF', fontWeight: 700, fontSize: 12, lineHeight: '18px' }}>
              {sensorData.nutrient_temp.toFixed(1)}℃
            </span>
          </div>
          <span
            className="glass-tag glass-tag-success mt-2 inline-block"
            style={{ fontSize: 10 }}
          >
            PID自动调节中 ({targetTempMin}~{targetTempMax}℃)
          </span>
        </div>
      )}
    </div>
  );
}

function TimerMisterModule() {
  const timerMisterEnabled = useAppStore((s) => s.autoControl.timerMisterEnabled);
  const setAutoControl = useAppStore((s) => s.setAutoControl);
  const misterTimer = useAppStore((s) => s.misterTimer);
  const setMisterTimer = useAppStore((s) => s.setMisterTimer);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const { sendModeCommand, sendCommand } = useControlCommand();
  const misterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMisterState = useRef(false);

  // 用 ref 存储最新值，避免闭包陷阱
  const misterTimerRef = useRef(misterTimer);
  const updateDeviceStatusRef = useRef(updateDeviceStatus);
  const sendCommandRef = useRef(sendCommand);

  misterTimerRef.current = misterTimer;
  updateDeviceStatusRef.current = updateDeviceStatus;
  sendCommandRef.current = sendCommand;

  const runMisterTimer = useCallback(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const timer = misterTimerRef.current;
    const cycleMinutes = timer.intervalMinutes + timer.durationMinutes;
    const posInCycle = minutes % cycleMinutes;
    const shouldBeOn = posInCycle >= timer.intervalMinutes;
    updateDeviceStatusRef.current({ mister: shouldBeOn });

    if (shouldBeOn !== prevMisterState.current) {
      sendCommandRef.current('mister', shouldBeOn ? 'on' : 'off');
      prevMisterState.current = shouldBeOn;
    }
  }, []);

  useEffect(() => {
    if (misterIntervalRef.current) {
      clearInterval(misterIntervalRef.current);
      misterIntervalRef.current = null;
    }

    if (timerMisterEnabled) {
      runMisterTimer();
      misterIntervalRef.current = setInterval(runMisterTimer, 30000);
    } else {
      // 关闭定时雾化时通知 ESP32 关闭雾化器
      if (prevMisterState.current) {
        sendCommand('mister', 'off');
      }
      updateDeviceStatus({ mister: false });
      prevMisterState.current = false;
    }

    return () => {
      if (misterIntervalRef.current) clearInterval(misterIntervalRef.current);
    };
  }, [timerMisterEnabled]); // 只依赖 timerMisterEnabled

  const handleToggle = (checked: boolean) => {
    setAutoControl({ timerMisterEnabled: checked });
    sendModeCommand('timer_mister', checked);
  };

  return (
    <div
      className="glass-card mb-3"
      style={{ padding: '4px 16px' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 0', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <ClockCircleOutlined style={{ color: '#00E5FF', fontSize: 13, display: 'flex', alignItems: 'center' }} />
          <span className="glass-title" style={{ fontSize: 12, lineHeight: '18px' }}>定时雾化</span>
        </div>
        <Switch
          checked={timerMisterEnabled}
          onChange={handleToggle}
          checkedChildren="开"
          unCheckedChildren="关"
          style={{ fontWeight: 600 }}
        />
      </div>

      {timerMisterEnabled && (
        <div style={{ padding: '8px 0 12px' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="glass-label" style={{ marginBottom: 4 }}>
                间隔(分钟)
              </div>
              <InputNumber
                size="small"
                min={5}
                max={120}
                value={misterTimer.intervalMinutes}
                onChange={(v) => v && setMisterTimer({ intervalMinutes: v })}
                className="w-full glass-input"
              />
            </div>
            <div>
              <div className="glass-label" style={{ marginBottom: 4 }}>
                持续(分钟)
              </div>
              <InputNumber
                size="small"
                min={1}
                max={30}
                value={misterTimer.durationMinutes}
                onChange={(v) => v && setMisterTimer({ durationMinutes: v })}
                className="w-full glass-input"
              />
            </div>
          </div>
          <span
            className="glass-tag glass-tag-success mt-2 inline-block"
            style={{ fontSize: 10 }}
          >
            <ClockCircleOutlined /> 每{misterTimer.intervalMinutes}分钟喷雾
            {misterTimer.durationMinutes}分钟
          </span>
        </div>
      )}
    </div>
  );
}

function PumpControlModule() {
  const pumpActive = useAppStore((s) => s.deviceStatus.pump);
  const { sendCommand } = useControlCommand();

  return (
    <div
      className="glass-card mb-3"
      style={{ padding: '4px 16px' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 0' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <DashboardOutlined style={{ color: '#00E5FF', fontSize: 13, display: 'flex', alignItems: 'center' }} />
          <span className="glass-title" style={{ fontSize: 12, lineHeight: '18px' }}>水泵控制</span>
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span
            className="glass-tag"
            style={{
              background: pumpActive
                ? 'rgba(0, 229, 255, 0.12)'
                : 'rgba(8, 24, 58, 0.50)',
              borderColor: pumpActive
                ? 'rgba(0, 229, 255, 0.30)'
                : 'rgba(0, 229, 255, 0.08)',
              color: pumpActive ? '#00E5FF' : 'rgba(176, 200, 224, 0.35)',
              fontSize: 10,
              padding: '2px 8px',
              lineHeight: '16px',
            }}
          >
            {pumpActive ? '运行中' : '已停止'}
          </span>
          <Switch
            checked={pumpActive}
            onChange={(checked) => sendCommand('pump', checked ? 'on' : 'off')}
            checkedChildren="开"
            unCheckedChildren="关"
            style={{ fontWeight: 600 }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const autoControl = useAppStore((s) => s.autoControl);

  const anyAutoEnabled = autoControl.pidEnabled || autoControl.timerMisterEnabled;

  return (
    <div className="h-full overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="glass-title" style={{ lineHeight: '22px' }}>智能控制中心</span>
        <SettingOutlined style={{ color: '#00E5FF', fontSize: 16, display: 'flex', alignItems: 'center' }} />
      </div>

      <div
        className="glass-card mb-3"
        style={{ padding: '4px 16px' }}
      >
        <div
          className="flex items-center"
          style={{ gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}
        >
          <ThunderboltOutlined style={{ color: '#00E5FF', fontSize: 13, display: 'flex', alignItems: 'center' }} />
          <span className="glass-title" style={{ fontSize: 12, lineHeight: '18px' }}>设备控制</span>
        </div>
        <DeviceControl
          label="加热棒"
          device="heater"
          active={deviceStatus.heater}
          icon={<ThunderboltOutlined />}
          disabled={autoControl.pidEnabled}
        />
        <DeviceControl
          label="制冷片"
          device="cooler"
          active={deviceStatus.cooler}
          icon={<ThunderboltOutlined />}
          disabled={autoControl.pidEnabled}
        />
        <DeviceControl
          label="雾化系统"
          device="mister"
          active={deviceStatus.mister}
          icon={<ThunderboltOutlined />}
          disabled={autoControl.timerMisterEnabled}
        />
      </div>

      <PIDControlModule />
      <TimerMisterModule />
      <PumpControlModule />

      {!anyAutoEnabled && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <span className="glass-label" style={{ opacity: 0.5 }}>手动模式 — 所有自动控制已关闭</span>
        </div>
      )}
    </div>
  );
}
