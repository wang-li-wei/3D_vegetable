import { useMemo } from 'react';
import { Modal, Tag, Descriptions, Typography, Badge, Space, Divider } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { SensorData } from '@/types';
import dayjs from 'dayjs';

const { Text } = Typography;

interface DeviceDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEVICE_INFO: Record<string, {
  name: string;
  type: 'sensor' | 'actuator';
  description: string;
  relatedParams: (keyof SensorData)[];
  specs: Array<{ label: string; value: string }>;
}> = {
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

export default function DeviceDetailModal({ visible, onClose }: DeviceDetailModalProps) {
  const selectedDevice = useAppStore((s) => s.selectedDevice);
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const thresholds = useAppStore((s) => s.thresholds);
  const historyData = useAppStore((s) => s.historyData);
  const autoControlMode = useAppStore((s) => s.autoControlMode);

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
        textStyle: { color: '#e0e0e0', fontSize: 12 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: '#1890ff',
        textStyle: { color: '#fff' },
      },
      grid: { left: 45, right: 15, top: 35, bottom: 25 },
      xAxis: {
        type: 'category',
        data: data.map((d) => dayjs(d.timestamp).format('HH:mm')),
        axisLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#999', fontSize: 9, interval: Math.floor(data.length / 6) },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#333' } },
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.value),
          smooth: true,
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24,144,255,0.3)' },
                { offset: 1, color: 'rgba(24,144,255,0.02)' },
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
      className="dark-modal"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              deviceInfo.type === 'sensor' ? 'bg-green-900/50 border border-green-500/30' : 'bg-blue-900/50 border border-blue-500/30'
            }`}>
              <InfoCircleOutlined className={deviceInfo.type === 'sensor' ? 'text-green-400' : 'text-blue-400'} />
            </div>
            <div>
              <div className="text-gray-200 font-semibold text-base">{deviceInfo.name}</div>
              <Tag color={deviceInfo.type === 'sensor' ? 'green' : 'blue'} className="m-0 mt-0.5">
                {deviceInfo.type === 'sensor' ? '传感器' : '执行器'}
              </Tag>
            </div>
          </div>
          {deviceInfo.type === 'actuator' && selectedDevice && ['heater', 'cooler', 'mister'].includes(selectedDevice) && (
            <Badge
              status={isDeviceActive ? 'success' : 'default'}
              text={<span className={isDeviceActive ? 'text-green-400' : 'text-gray-500'}>{isDeviceActive ? '运行中' : '已停止'}</span>}
            />
          )}
        </div>

        <div className="bg-gray-800/50 rounded p-2.5 border border-gray-700/50">
          <Text className="text-gray-400 text-xs">{deviceInfo.description}</Text>
        </div>

        {deviceInfo.type === 'actuator' && selectedDevice && ['heater', 'cooler', 'mister'].includes(selectedDevice) && (
          <div className="bg-gray-800/50 rounded p-2.5 border border-gray-700/50">
            <div className="text-gray-400 text-xs mb-1.5">自动控制状态</div>
            <Tag color={autoControlMode !== 'off' ? 'blue' : 'default'}>
              {autoControlMode === 'off' ? '手动模式' : autoControlMode === 'pid_temp' ? 'PID温度控制' : '定时雾化'}
            </Tag>
          </div>
        )}

        <div>
          <div className="text-gray-400 text-xs mb-1.5">设备参数</div>
          <div className="grid grid-cols-2 gap-1.5">
            {deviceInfo.specs.map((spec) => (
              <div key={spec.label} className="bg-gray-800/40 rounded px-2 py-1.5 flex justify-between">
                <span className="text-gray-500 text-xs">{spec.label}</span>
                <span className="text-gray-300 text-xs font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {deviceInfo.relatedParams.length > 0 && (
          <div>
            <div className="text-gray-400 text-xs mb-1.5">关联参数</div>
            <div className="space-y-1">
              {deviceInfo.relatedParams.map((param) => {
                const config = SENSOR_CONFIG.find((c) => c.key === param);
                const value = sensorData[param];
                const threshold = thresholds[param];
                const isAlarm = value > threshold.max || value < threshold.min;
                return (
                  <div key={param} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1.5">
                    <span className="text-gray-400 text-xs">{config?.icon} {config?.label}</span>
                    <Space size={4}>
                      <span className={`text-sm font-bold ${isAlarm ? 'text-red-400' : 'text-blue-400'}`}>
                        {value.toFixed(config?.decimals ?? 1)}{config?.unit}
                      </span>
                      <Tag color={isAlarm ? 'error' : 'success'} className="m-0 text-[10px]">
                        {isAlarm ? '异常' : '正常'}
                      </Tag>
                    </Space>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chartOption && (
          <div>
            <div className="text-gray-400 text-xs mb-1.5">数据趋势</div>
            <ReactECharts option={chartOption} style={{ height: 180 }} />
          </div>
        )}
      </div>
    </Modal>
  );
}
