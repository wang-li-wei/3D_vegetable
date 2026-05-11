import { useState, useMemo } from 'react';
import { Card, Select, Button, Typography, Table, DatePicker } from 'antd';
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/store/useAppStore';
import { generateDailyStats } from '@/utils/simulator';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type StatPeriod = 'day' | 'week' | 'month';

export default function StatsPanel() {
  const [period, setPeriod] = useState<StatPeriod>('week');
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);

  const statsData = useMemo(() => generateDailyStats(period === 'day' ? 1 : period === 'week' ? 7 : 30), [period]);

  const envChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: '环境参数趋势',
        textStyle: { color: '#e0e0e0', fontSize: 12 },
        left: 'center',
      },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
      legend: {
        data: ['温度', '湿度', 'pH'],
        textStyle: { color: '#999', fontSize: 10 },
        bottom: 0,
      },
      grid: { left: 40, right: 20, top: 35, bottom: 35 },
      xAxis: {
        type: 'category',
        data: statsData.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#999', fontSize: 9 },
      },
      yAxis: [
        { type: 'value', axisLabel: { color: '#999' }, splitLine: { lineStyle: { color: '#333' } } },
      ],
      series: [
        {
          name: '温度',
          type: 'line',
          data: statsData.map((d) => d.avgAirTemp),
          smooth: true,
          lineStyle: { color: '#ff6b6b', width: 2 },
          itemStyle: { color: '#ff6b6b' },
        },
        {
          name: '湿度',
          type: 'line',
          data: statsData.map((d) => d.avgAirHum),
          smooth: true,
          lineStyle: { color: '#4ecdc4', width: 2 },
          itemStyle: { color: '#4ecdc4' },
        },
        {
          name: 'pH',
          type: 'line',
          data: statsData.map((d) => d.avgPh),
          smooth: true,
          lineStyle: { color: '#ffe66d', width: 2 },
          itemStyle: { color: '#ffe66d' },
          yAxisIndex: 0,
        },
      ],
    }),
    [statsData]
  );

  const energyChartOption = useMemo(
    () => ({
      backgroundColor: 'transparent',
      title: {
        text: '设备运行时长(h)',
        textStyle: { color: '#e0e0e0', fontSize: 12 },
        left: 'center',
      },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
      legend: {
        data: ['加热棒', '制冷片', '雾化系统'],
        textStyle: { color: '#999', fontSize: 10 },
        bottom: 0,
      },
      grid: { left: 40, right: 20, top: 35, bottom: 35 },
      xAxis: {
        type: 'category',
        data: statsData.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: '#555' } },
        axisLabel: { color: '#999', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { color: '#333' } },
      },
      series: [
        {
          name: '加热棒',
          type: 'bar',
          data: statsData.map((d) => d.heaterHours),
          itemStyle: { color: '#ff6b6b' },
        },
        {
          name: '制冷片',
          type: 'bar',
          data: statsData.map((d) => d.coolerHours),
          itemStyle: { color: '#4ecdc4' },
        },
        {
          name: '雾化系统',
          type: 'bar',
          data: statsData.map((d) => d.misterHours),
          itemStyle: { color: '#1890ff' },
        },
      ],
    }),
    [statsData]
  );

  const handleExport = () => {
    const wsData = [
      ['日期', '平均温度(℃)', '平均湿度(%)', '营养液温度(℃)', '平均光照(lux)', '平均pH', '加热时长(h)', '制冷时长(h)', '雾化时长(h)'],
      ...statsData.map((d) => [
        d.date,
        d.avgAirTemp,
        d.avgAirHum,
        d.avgNutrientTemp,
        d.avgLight,
        d.avgPh,
        d.heaterHours,
        d.coolerHours,
        d.misterHours,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '环境数据统计');
    XLSX.writeFile(wb, `生菜水培数据统计_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  const columns: ColumnsType<typeof statsData[0]> = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 90, render: (v: string) => <span className="text-gray-300 text-xs">{v.slice(5)}</span> },
    { title: '温度', dataIndex: 'avgAirTemp', key: 'avgAirTemp', width: 60, render: (v: number) => <span className="text-xs">{v}℃</span> },
    { title: '湿度', dataIndex: 'avgAirHum', key: 'avgAirHum', width: 60, render: (v: number) => <span className="text-xs">{v}%</span> },
    { title: 'pH', dataIndex: 'avgPh', key: 'avgPh', width: 50, render: (v: number) => <span className="text-xs">{v}</span> },
  ];

  return (
    <div className="h-full overflow-y-auto px-2 py-1 custom-scrollbar">
      <div className="flex items-center justify-between mb-3 px-1">
        <Text className="text-gray-300 text-sm font-semibold">数据统计</Text>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onChange={setPeriod}
            size="small"
            style={{ width: 80 }}
            options={[
              { value: 'day', label: '日' },
              { value: 'week', label: '周' },
              { value: 'month', label: '月' },
            ]}
          />
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            className="text-blue-400"
            onClick={handleExport}
          />
        </div>
      </div>

      <ReactECharts option={envChartOption} style={{ height: 200 }} />
      <ReactECharts option={energyChartOption} style={{ height: 200 }} />

      <Table
        dataSource={statsData}
        columns={columns}
        rowKey="date"
        size="small"
        pagination={false}
        className="mt-2"
        scroll={{ y: 150 }}
      />
    </div>
  );
}
