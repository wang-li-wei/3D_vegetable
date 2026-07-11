import { useMemo } from 'react';
import { Modal, Badge, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { SensorData } from '@/types';
import dayjs from 'dayjs';

interface DeviceDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEVICE_INFO: Record<
  string,
  {
    name: string;
    type: 'sensor' | 'actuator';
    description: string;
    relatedParams: (keyof SensorData)[];
    specs: Array<{ label: string; value: string }>;
  }
> = {
  heater: {
    name: '加热棒',
    type: 'actuator',
    description: '用于营养液温度调节，当营养液温度低于设定下限时自动启动加热',
    relatedParams: ['nutrient_temp'],
    specs: [
      { label: '额定功率', value: '300W' },
      { label: '工作电压', value: 'AC 220V' },
      { label: '温度范围', value: '0~80℃' },
      { label: '防护等级', value: 'IP68' },
    ],
  },
  cooler: {
    name: '制冷片',
    type: 'actuator',
    description: '用于环境温度和营养液温度降温，采用半导体制冷技术',
    relatedParams: ['nutrient_temp', 'air_temp'],
    specs: [
      { label: '额定功率', value: '200W' },
      { label: '工作电压', value: 'DC 12V' },
      { label: '温差', value: '最大65℃' },
      { label: '制冷量', value: '50W' },
    ],
  },
  mister: {
    name: '雾化系统',
    type: 'actuator',
    description: '超声波雾化器，将营养液雾化为微米级颗粒，直接喷洒到根系',
    relatedParams: ['air_hum', 'nutrient_temp'],
    specs: [
      { label: '雾化量', value: '300mL/h' },
      { label: '雾化粒径', value: '1~5μm' },
      { label: '工作电压', value: 'DC 24V' },
      { label: '频率', value: '1.7MHz' },
    ],
  },
  air_temp_sensor: {
    name: '环境温度传感器',
    type: 'sensor',
    description: '高精度数字温度传感器，监测大棚内空气温度',
    relatedParams: ['air_temp'],
    specs: [
      { label: '型号', value: 'SHT30' },
      { label: '精度', value: '±0.2℃' },
      { label: '量程', value: '-40~125℃' },
      { label: '通信', value: 'I2C' },
    ],
  },
  air_hum_sensor: {
    name: '环境湿度传感器',
    type: 'sensor',
    description: '电容式湿度传感器，监测大棚内空气相对湿度',
    relatedParams: ['air_hum'],
    specs: [
      { label: '型号', value: 'SHT30' },
      { label: '精度', value: '±2%RH' },
      { label: '量程', value: '0~100%RH' },
      { label: '通信', value: 'I2C' },
    ],
  },
  nutrient_temp_sensor: {
    name: '营养液温度传感器',
    type: 'sensor',
    description: '防水型温度传感器，浸入营养液中监测液温',
    relatedParams: ['nutrient_temp'],
    specs: [
      { label: '型号', value: 'DS18B20' },
      { label: '精度', value: '±0.5℃' },
      { label: '量程', value: '-55~125℃' },
      { label: '通信', value: '1-Wire' },
    ],
  },
  light_sensor: {
    name: '光照传感器',
    type: 'sensor',
    description: '光敏传感器，监测大棚内光照强度',
    relatedParams: ['light'],
    specs: [
      { label: '型号', value: 'BH1750' },
      { label: '精度', value: '±20%' },
      { label: '量程', value: '1~65535lux' },
      { label: '通信', value: 'I2C' },
    ],
  },
  ph_sensor: {
    name: 'pH传感器',
    type: 'sensor',
    description: '电化学pH传感器，实时监测营养液酸碱度',
    relatedParams: ['ph'],
    specs: [
      { label: '型号', value: 'PH-4502C' },
      { label: '精度', value: '±0.1pH' },
      { label: '量程', value: '0~14pH' },
      { label: '通信', value: '模拟量' },
    ],
  },
  nutrient_tank: {
    name: '营养液罐',
    type: 'actuator',
    description: '储存和调配营养液的容器，配备液位传感器和循环泵',
    relatedParams: ['nutrient_temp', 'ph'],
    specs: [
      { label: '容量', value: '100L' },
      { label: '材质', value: '食品级PE' },
      { label: '液位传感器', value: '超声波' },
      { label: '循环泵', value: '12V DC' },
    ],
  },
  control_box: {
    name: '控制箱',
    type: 'actuator',
    description: '主控制器，集成ESP32单片机，负责数据采集和设备控制',
    relatedParams: ['air_temp', 'air_hum', 'nutrient_temp', 'light', 'ph'],
    specs: [
      { label: '主控', value: 'ESP32-S3' },
      { label: '通信', value: 'WiFi/MQTT' },
      { label: 'ADC', value: '12位' },
      { label: 'IO', value: '36路' },
    ],
  },
};

export default function DeviceDetailModal({
  visible,
  onClose,
}: DeviceDetailModalProps) {
  const selectedDevice = useAppStore((s) => s.selectedDevice);
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const thresholds = useAppStore((s) => s.thresholds);
  const historyData = useAppStore((s) => s.historyData);
  const autoControl = useAppStore((s) => s.autoControl);

  const deviceInfo = selectedDevice ? DEVICE_INFO[selectedDevice] : null;

  const isDeviceActive = useMemo(() => {
    if (!selectedDevice) return false;
    if (selectedDevice === 'heater') return deviceStatus.heater;
    if (selectedDevice === 'cooler') return deviceStatus.cooler;
    if (selectedDevice === 'mister') return deviceStatus.mister;
    return false;
  }, [selectedDevice, deviceStatus]);

  const chartOption = useMemo(() => {
    if (!deviceInfo || deviceInfo.relatedParams.length === 0) return null;
    const param = deviceInfo.relatedParams[0];
    const data = historyData[param] || [];
    const config = SENSOR_CONFIG.find((c) => c.key === param);

    return {
      backgroundColor: 'transparent',
      title: {
        text: `${config?.label || param} 趋势`,
        textStyle: { color: '#E8F4FF', fontSize: 12, fontWeight: 600 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(6, 18, 44, 0.90)',
        borderColor: 'rgba(0, 229, 255, 0.25)',
        textStyle: { color: '#B0C8E0' },
      },
      grid: { left: 45, right: 15, top: 35, bottom: 25 },
      xAxis: {
        type: 'category',
        data: data.map((d) => dayjs(d.timestamp).format('HH:mm')),
        axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.15)' } },
        axisLabel: {
          color: 'rgba(176, 200, 224, 0.50)',
          fontSize: 9,
          interval: Math.floor(data.length / 6),
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.15)' } },
        axisLabel: { color: 'rgba(176, 200, 224, 0.50)' },
        splitLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.06)' } },
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.value),
          smooth: true,
          lineStyle: { color: '#00E5FF', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0,229,255,0.25)' },
                { offset: 1, color: 'rgba(0,229,255,0.02)' },
              ],
            },
          },
          symbol: 'none',
        },
      ],
    };
  }, [deviceInfo, historyData]);

  if (!deviceInfo) return null;

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      className="glass-modal"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  deviceInfo.type === 'sensor'
                    ? 'rgba(0, 255, 136, 0.12)'
                    : 'rgba(0, 229, 255, 0.12)',
                border: `1px solid ${
                  deviceInfo.type === 'sensor'
                    ? 'rgba(0, 255, 136, 0.25)'
                    : 'rgba(0, 229, 255, 0.30)'
                }`,
              }}
            >
              <InfoCircleOutlined
                style={{
                  color:
                    deviceInfo.type === 'sensor' ? '#00FF88' : '#00E5FF',
                }}
              />
            </div>
            <div>
              <div
                style={{
                  color: '#E8F4FF',
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {deviceInfo.name}
              </div>
              <span
                className="glass-tag"
                style={{
                  background:
                    deviceInfo.type === 'sensor'
                      ? 'rgba(0, 255, 136, 0.12)'
                      : 'rgba(0, 229, 255, 0.12)',
                  borderColor:
                    deviceInfo.type === 'sensor'
                      ? 'rgba(0, 255, 136, 0.25)'
                      : 'rgba(0, 229, 255, 0.30)',
                  color:
                    deviceInfo.type === 'sensor' ? '#00FF88' : '#00E5FF',
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {deviceInfo.type === 'sensor' ? '传感器' : '执行器'}
              </span>
            </div>
          </div>
          {deviceInfo.type === 'actuator' &&
            selectedDevice &&
            ['heater', 'cooler', 'mister'].includes(selectedDevice) && (
              <Badge
                status={isDeviceActive ? 'success' : 'default'}
                text={
                  <span
                    style={{
                      color: isDeviceActive ? '#00FF88' : 'rgba(176, 200, 224, 0.35)',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {isDeviceActive ? '运行中' : '已停止'}
                  </span>
                }
              />
            )}
        </div>

        <div
          className="glass-card"
          style={{ padding: '10px 14px' }}
        >
          <span
            className="glass-label"
            style={{ fontSize: 12, lineHeight: 1.5 }}
          >
            {deviceInfo.description}
          </span>
        </div>

        {deviceInfo.type === 'actuator' &&
          selectedDevice &&
          ['heater', 'cooler', 'mister'].includes(selectedDevice) && (
            <div
              className="glass-card"
              style={{ padding: '10px 14px' }}
            >
              <div className="glass-label" style={{ marginBottom: 6 }}>
                自动控制状态
              </div>
              <div className="flex items-center" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span
                  className="glass-tag"
                  style={{
                    background: autoControl.pidEnabled
                      ? 'rgba(0, 229, 255, 0.12)'
                      : 'rgba(8, 24, 58, 0.50)',
                    borderColor: autoControl.pidEnabled
                      ? 'rgba(0, 229, 255, 0.30)'
                      : 'rgba(0, 229, 255, 0.08)',
                    color: autoControl.pidEnabled ? '#00E5FF' : 'rgba(176, 200, 224, 0.35)',
                  }}
                >
                  {autoControl.pidEnabled ? 'PID温度控制' : 'PID未启用'}
                </span>
                <span
                  className="glass-tag"
                  style={{
                    background: autoControl.timerMisterEnabled
                      ? 'rgba(0, 229, 255, 0.12)'
                      : 'rgba(8, 24, 58, 0.50)',
                    borderColor: autoControl.timerMisterEnabled
                      ? 'rgba(0, 229, 255, 0.30)'
                      : 'rgba(0, 229, 255, 0.08)',
                    color: autoControl.timerMisterEnabled ? '#00E5FF' : 'rgba(176, 200, 224, 0.35)',
                  }}
                >
                  {autoControl.timerMisterEnabled ? '定时雾化' : '雾化未启用'}
                </span>
                {!autoControl.pidEnabled && !autoControl.timerMisterEnabled && (
                  <span
                    className="glass-tag"
                    style={{
                      background: 'rgba(8, 24, 58, 0.50)',
                      borderColor: 'rgba(0, 229, 255, 0.08)',
                      color: 'rgba(176, 200, 224, 0.35)',
                    }}
                  >
                    手动模式
                  </span>
                )}
              </div>
            </div>
          )}

        <div>
          <div className="glass-label" style={{ marginBottom: 8 }}>
            设备参数
          </div>
          <div className="grid grid-cols-2 gap-2">
            {deviceInfo.specs.map((spec) => (
              <div
                key={spec.label}
                className="glass-card"
                style={{ padding: '8px 12px' }}
              >
                <div className="flex justify-between items-center">
                  <span className="glass-label">{spec.label}</span>
                  <span
                    style={{
                      color: '#E8F4FF',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {spec.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {deviceInfo.relatedParams.length > 0 && (
          <div>
            <div className="glass-label" style={{ marginBottom: 8 }}>
              关联参数
            </div>
            <div className="space-y-1.5">
              {deviceInfo.relatedParams.map((param) => {
                const config = SENSOR_CONFIG.find((c) => c.key === param);
                const value = sensorData[param];
                const threshold = thresholds[param];
                const isAlarm = value > threshold.max || value < threshold.min;
                return (
                  <div
                    key={param}
                    className={`flex items-center justify-between ${
                      isAlarm ? 'glass-card-alarm' : 'glass-card'
                    }`}
                    style={{ padding: '8px 12px' }}
                  >
                    <span className="glass-label">
                      {config?.icon} {config?.label}
                    </span>
                    <Space size={6}>
                      <span
                        className="glass-value-sm"
                        style={{
                          color: isAlarm ? '#FF4757' : '#00E5FF',
                          fontSize: 14,
                        }}
                      >
                        {value.toFixed(config?.decimals ?? 1)}
                        {config?.unit}
                      </span>
                      <span
                        className="glass-tag"
                        style={{
                          background: isAlarm
                            ? 'rgba(255, 71, 87, 0.15)'
                            : 'rgba(0, 255, 136, 0.12)',
                          borderColor: isAlarm
                            ? 'rgba(255, 71, 87, 0.30)'
                            : 'rgba(0, 255, 136, 0.25)',
                          color: isAlarm ? '#FF4757' : '#00FF88',
                          fontSize: 9,
                          padding: '1px 6px',
                        }}
                      >
                        {isAlarm ? '异常' : '正常'}
                      </span>
                    </Space>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chartOption && (
          <div>
            <div className="glass-label" style={{ marginBottom: 8 }}>
              数据趋势
            </div>
            <ReactECharts option={chartOption} style={{ height: 180 }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
