import { useState, useMemo } from 'react';
import { Modal } from 'antd';
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
    <div
      className={isAlarm ? 'glass-card-alarm' : 'glass-card'}
      onClick={onClick}
      style={{ padding: '12px 16px', cursor: 'pointer' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center' }}>{config.icon}</span>
          <div>
            <div className="glass-label">{config.label}</div>
            <div className="flex items-center" style={{ gap: 2, marginTop: 2 }}>
              <span
                className="glass-value-sm animate-number"
                style={{ color: isAlarm ? '#FF4757' : '#00E5FF', lineHeight: 1.2, fontSize: 20 }}
              >
                {value.toFixed(config.decimals)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(176, 200, 224, 0.55)', lineHeight: 1.2 }}>{config.unit}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end" style={{ gap: 6 }}>
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
              fontSize: 10,
              padding: '2px 8px',
              lineHeight: '16px',
            }}
          >
            {isAlarm ? <AlertOutlined /> : <CheckCircleOutlined />}{' '}
            {isAlarm ? '异常' : '正常'}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(176, 200, 224, 0.40)', lineHeight: '14px' }}>
            {threshold.min}~{threshold.max}
          </span>
        </div>
      </div>
    </div>
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
        textStyle: { color: '#E8F4FF', fontSize: 14, fontWeight: 600 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(6, 18, 44, 0.90)',
        borderColor: 'rgba(0, 229, 255, 0.25)',
        textStyle: { color: '#B0C8E0' },
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
        axisLine: { lineStyle: { color: 'rgba(0, 229, 255, 0.15)' } },
        axisLabel: { color: 'rgba(176, 200, 224, 0.50)', fontSize: 10, interval: 11 },
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
          data: historyData.map((d) => d.value),
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
      className="glass-modal"
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
    <div className="overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="glass-title" style={{ lineHeight: '22px' }}>实时数据监测</span>
        <LineChartOutlined style={{ color: '#00E5FF', fontSize: 16, display: 'flex', alignItems: 'center' }} />
      </div>
      <div className="space-y-3">
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
      </div>
      <HistoryChart
        parameter={chartParam}
        visible={chartVisible}
        onClose={() => setChartVisible(false)}
      />
    </div>
  );
}
