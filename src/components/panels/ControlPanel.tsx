import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Switch, Select, InputNumber, Button, Tag, Typography, Divider, message } from 'antd';
import {
  ThunderboltOutlined,
  SettingOutlined,
  RobotOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { useControlCommand } from '@/hooks/useMqttData';
import type { AutoControlMode } from '@/types';

const { Text } = Typography;

function DeviceControl({
  label,
  device,
  active,
  icon,
}: {
  label: string;
  device: 'heater' | 'cooler' | 'mister';
  active: boolean;
  icon: React.ReactNode;
}) {
  const { sendCommand } = useControlCommand();

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-blue-400">{icon}</span>
        <Text className="text-gray-300 text-sm">{label}</Text>
      </div>
      <div className="flex items-center gap-2">
        <Tag color={active ? 'green' : 'default'} className="m-0 text-xs">
          {active ? '运行中' : '已停止'}
        </Tag>
        <Switch
          checked={active}
          onChange={(checked) => sendCommand(device, checked ? 'on' : 'off')}
          checkedChildren="开"
          unCheckedChildren="关"
        />
      </div>
    </div>
  );
}

function AutoControlPanel() {
  const autoControlMode = useAppStore((s) => s.autoControlMode);
  const setAutoControlMode = useAppStore((s) => s.setAutoControlMode);
  const misterTimer = useAppStore((s) => s.misterTimer);
  const setMisterTimer = useAppStore((s) => s.setMisterTimer);
  const sensorData = useAppStore((s) => s.sensorData);
  const updateDeviceStatus = useAppStore((s) => s.updateDeviceStatus);
  const pidIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const misterIntervalRef = useRef<ReturnType<typeof setInterval> | null>( null);
  const pidStateRef = useRef({ integral: 0, lastError: 0 });

  const runPIDControl = useCallback(() => {
    const targetTemp = 20;
    const error = targetTemp - sensorData.nutrient_temp;
    pidStateRef.current.integral += error;
    const derivative = error - pidStateRef.current.lastError;
    pidStateRef.current.lastError = error;

    const output =
      2.0 * error + 0.1 * pidStateRef.current.integral + 1.0 * derivative;

    if (output > 0.5) {
      updateDeviceStatus({ heater: true, cooler: false });
    } else if (output < -0.5) {
      updateDeviceStatus({ cooler: true, heater: false });
    } else {
      updateDeviceStatus({ heater: false, cooler: false });
    }
  }, [sensorData.nutrient_temp, updateDeviceStatus]);

  const runMisterTimer = useCallback(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const cycleMinutes = misterTimer.intervalMinutes + misterTimer.durationMinutes;
    const posInCycle = minutes % cycleMinutes;
    const shouldBeOn = posInCycle >= misterTimer.intervalMinutes;
    updateDeviceStatus({ mister: shouldBeOn });
  }, [misterTimer, updateDeviceStatus]);

  useEffect(() => {
    if (pidIntervalRef.current) {
      clearInterval(pidIntervalRef.current);
      pidIntervalRef.current = null;
    }
    if (misterIntervalRef.current) {
      clearInterval(misterIntervalRef.current);
      misterIntervalRef.current = null;
    }

    if (autoControlMode === 'pid_temp') {
      runPIDControl();
      pidIntervalRef.current = setInterval(runPIDControl, 5000);
    } else if (autoControlMode === 'timer_mister') {
      runMisterTimer();
      misterIntervalRef.current = setInterval(runMisterTimer, 30000);
    }

    return () => {
      if (pidIntervalRef.current) clearInterval(pidIntervalRef.current);
      if (misterIntervalRef.current) clearInterval(misterIntervalRef.current);
    };
  }, [autoControlMode, runPIDControl, runMisterTimer]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RobotOutlined className="text-blue-400" />
          <Text className="text-gray-300 text-sm font-semibold">自动控制</Text>
        </div>
        <Select
          value={autoControlMode}
          onChange={setAutoControlMode}
          size="small"
          style={{ width: 140 }}
          options={[
            { value: 'off', label: '手动模式' },
            { value: 'pid_temp', label: 'PID温度控制' },
            { value: 'timer_mister', label: '定时雾化' },
          ]}
        />
      </div>

      {autoControlMode === 'pid_temp' && (
        <Card size="small" className="bg-gray-800/60 border-gray-700 mb-2">
          <div className="text-xs text-gray-400 mb-2">营养液温度PID控制</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">目标温度</span>
            <span className="text-blue-400 font-bold">18~22℃</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-400">当前温度</span>
            <span className="text-green-400 font-bold">
              {sensorData.nutrient_temp.toFixed(1)}℃
            </span>
          </div>
          <Tag color="blue" className="mt-2 text-xs">
            PID自动调节中
          </Tag>
        </Card>
      )}

      {autoControlMode === 'timer_mister' && (
        <Card size="small" className="bg-gray-800/60 border-gray-700 mb-2">
          <div className="text-xs text-gray-400 mb-2">雾化系统定时控制</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-gray-500 text-[10px]">间隔(分钟)</div>
              <InputNumber
                size="small"
                min={5}
                max={120}
                value={misterTimer.intervalMinutes}
                onChange={(v) => v && setMisterTimer({ intervalMinutes: v })}
                className="w-full"
              />
            </div>
            <div>
              <div className="text-gray-500 text-[10px]">持续(分钟)</div>
              <InputNumber
                size="small"
                min={1}
                max={30}
                value={misterTimer.durationMinutes}
                onChange={(v) => v && setMisterTimer({ durationMinutes: v })}
                className="w-full"
              />
            </div>
          </div>
          <Tag color="blue" className="mt-2 text-xs">
            <ClockCircleOutlined /> 每{misterTimer.intervalMinutes}分钟喷雾
            {misterTimer.durationMinutes}分钟
          </Tag>
        </Card>
      )}
    </div>
  );
}

export default function ControlPanel() {
  const deviceStatus = useAppStore((s) => s.deviceStatus);

  return (
    <div className="h-full overflow-y-auto px-2 py-1 custom-scrollbar">
      <div className="flex items-center justify-between mb-3 px-1">
        <Text className="text-gray-300 text-sm font-semibold">智能控制中心</Text>
        <SettingOutlined className="text-blue-400" />
      </div>

      <Card
        size="small"
        className="bg-gray-800/60 border-gray-700 mb-3"
        title={
          <span className="text-gray-300 text-xs">
            <ThunderboltOutlined className="mr-1" />
            设备控制
          </span>
        }
      >
        <DeviceControl
          label="加热棒"
          device="heater"
          active={deviceStatus.heater}
          icon={<ThunderboltOutlined />}
        />
        <Divider className="my-1 border-gray-700" />
        <DeviceControl
          label="制冷片"
          device="cooler"
          active={deviceStatus.cooler}
          icon={<ThunderboltOutlined />}
        />
        <Divider className="my-1 border-gray-700" />
        <DeviceControl
          label="雾化系统"
          device="mister"
          active={deviceStatus.mister}
          icon={<ThunderboltOutlined />}
        />
      </Card>

      <Card
        size="small"
        className="bg-gray-800/60 border-gray-700"
        title={
          <span className="text-gray-300 text-xs">
            <RobotOutlined className="mr-1" />
            自动控制模式
          </span>
        }
      >
        <AutoControlPanel />
      </Card>
    </div>
  );
}
