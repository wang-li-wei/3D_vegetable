import { useState, useMemo } from 'react';
import { Card, Tag, Modal, Typography } from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { SensorData } from '@/types';
import dayjs from 'dayjs';

const { Text } = Typography;

function SensorCard({
  config,
  value,
  isAlarm,
  threshold,
  onClick,
}: {
  config: (typeof SENSOR_CONFIG)[number];
  value: number;
  isAlarm: boolean;
  threshold: { min: number; max: number };
  onClick: () => void;
}) {
  return (
    <Card
      size="small"
      className={`mb-2 cursor-pointer transition-all duration-300 ${
        isAlarm
          ? 'border-red-500 bg-red-900/20 shadow-[0_0_10px_rgba(255,0,0,0.3)]'
          : 'border-gray-700 bg-gray-800/60 hover:border-blue-500'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="text-gray-400 text-xs">{config.label}</div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xl font-bold ${
                  isAlarm ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {value.toFixed(config.decimals)}
              </span>
              <span className="text-gray-500 text-xs">{config.unit}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Tag
            icon={isAlarm ? <AlertOutlined /> : <CheckCircleOutlined />}
            color={isAlarm ? 'error' : 'success'}
            className="text-xs m-0"
          >
            {isAlarm ? '异常' : '正常'}
          </Tag>
          <div className="text-gray-500 text-[10px]">
            {threshold.min}~{threshold.max}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HistoryChart({
  parameter,
  visible,
  onClose,
}: {
  parameter: keyof SensorData;
  visible: boolean;
  onClose: () => void;
}) {
  const historyData = useAppStore((s) => s.historyData[parameter]);
  const config = SENSOR_CONFIG.find((c) => c.key === parameter)!;

  const chartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: `${config.label} 24小时趋势`,
        textStyle: { color: '#e0e0e0', fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderColor: '#1890ff',
        textStyle: { color: '#fff' },
        formatter: (params: Array<{ value: number; dataIndex: number }>) => {
          const p = params[0];
          const time = dayjs(historyData[p.dataIndex]?.timestamp).format('HH:mm');
          return `${time}<br/>${config.label}: ${p.value}${config.unit}`;
        },
      },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: historyData.map((d) => dayjs(d.timestamp).format('HH:mm')),
        axisLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#999', fontSize: 10, interval: 11 },
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
          data: historyData.map((d) => d.value),
          smooth: true,
          lineStyle: { color: '#1890ff', width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24,144,255,0.3)' },
                { offset: 1, color: 'rgba(24,144,255,0.02)' },
              ],
            },
          },
          symbol: 'none',
        },
      ],
    }),
    [historyData, config]
  );

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      className="dark-modal"
    >
      <ReactECharts option={chartOption} style={{ height: 350 }} />
    </Modal>
  );
}

export default function SensorPanel() {
  const sensorData = useAppStore((s) => s.sensorData);
  const thresholds = useAppStore((s) => s.thresholds);
  const [chartVisible, setChartVisible] = useState(false);
  const [chartParam, setChartParam] = useState<keyof SensorData>('air_temp');

  const isAlarm = (key: keyof SensorData) => {
    const val = sensorData[key];
    const t = thresholds[key];
    return val > t.max || val < t.min;
  };

  const handleCardClick = (key: keyof SensorData) => {
    setChartParam(key);
    setChartVisible(true);
  };

  return (
    <div className="h-full overflow-y-auto px-2 py-1 custom-scrollbar">
      <div className="flex items-center justify-between mb-3 px-1">
        <Text className="text-gray-300 text-sm font-semibold">实时数据监测</Text>
        <LineChartOutlined className="text-blue-400" />
      </div>
      {SENSOR_CONFIG.map((config) => (
        <SensorCard
          key={config.key}
          config={config}
          value={sensorData[config.key]}
          isAlarm={isAlarm(config.key)}
          threshold={thresholds[config.key]}
          onClick={() => handleCardClick(config.key)}
        />
      ))}
      <HistoryChart
        parameter={chartParam}
        visible={chartVisible}
        onClose={() => setChartVisible(false)}
      />
    </div>
  );
}
