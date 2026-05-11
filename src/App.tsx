import { useState } from 'react';
import { ConfigProvider, theme, Tag, Badge } from 'antd';
import {
  ApiOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BellOutlined,
  CloudServerOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import TopNav from '@/components/common/TopNav';
import DeviceDetailModal from '@/components/common/DeviceDetailModal';
import SceneCanvas from '@/components/three/SceneCanvas';
import SensorPanel from '@/components/panels/SensorPanel';
import ControlPanel from '@/components/panels/ControlPanel';
import AlarmPanel from '@/components/panels/AlarmPanel';
import GrowthPanel from '@/components/panels/GrowthPanel';
import StatsPanel from '@/components/panels/StatsPanel';
import { useMqttData } from '@/hooks/useMqttData';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { SensorData } from '@/types';

type TabKey = 'monitor' | 'control' | 'alarm' | 'growth' | 'stats';

function RightPanel({ activeTab }: { activeTab: TabKey }) {
  switch (activeTab) {
    case 'monitor':
      return <SensorPanel />;
    case 'control':
      return <ControlPanel />;
    case 'alarm':
      return <AlarmPanel />;
    case 'growth':
      return <GrowthPanel />;
    case 'stats':
      return <StatsPanel />;
    default:
      return <SensorPanel />;
  }
}

function QuickStatus() {
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const thresholds = useAppStore((s) => s.thresholds);
  const growthStage = useAppStore((s) => s.growthStage);
  const growthDay = useAppStore((s) => s.growthDay);
  const alarms = useAppStore((s) => s.alarms);
  const system = useAppStore((s) => s.system);

  const activeAlarmCount = alarms.filter((a) => a.status === 'active').length;
  const isAlarm = (key: keyof SensorData) => {
    const val = sensorData[key];
    const t = thresholds[key];
    return val > t.max || val < t.min;
  };

  const stageLabels: Record<string, string> = {
    seedling: '幼苗期',
    growing: '生长期',
    harvest: '收获期',
  };

  const stageColors: Record<string, string> = {
    seedling: 'text-green-400',
    growing: 'text-emerald-400',
    harvest: 'text-lime-300',
  };

  return (
    <div className="px-2 py-2 space-y-2">
      <div className="text-xs text-gray-400 font-semibold mb-1 flex items-center gap-1">
        <DashboardOutlined className="text-blue-400" />
        快捷状态
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-gray-800/60 rounded px-2 py-1.5 border border-gray-700/50">
          <div className="text-[10px] text-gray-500">连接状态</div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${system.connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`text-xs font-medium ${system.connected ? 'text-green-400' : 'text-red-400'}`}>
              {system.connected ? '在线' : '离线'}
            </span>
          </div>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1.5 border border-gray-700/50">
          <div className="text-[10px] text-gray-500">生长阶段</div>
          <span className={`text-xs font-medium ${stageColors[growthStage]}`}>
            {stageLabels[growthStage]} · D{growthDay}
          </span>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1.5 border border-gray-700/50">
          <div className="text-[10px] text-gray-500">报警</div>
          <span className={`text-xs font-medium ${activeAlarmCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {activeAlarmCount > 0 ? `${activeAlarmCount}个活跃` : '全部正常'}
          </span>
        </div>
        <div className="bg-gray-800/60 rounded px-2 py-1.5 border border-gray-700/50">
          <div className="text-[10px] text-gray-500">设备</div>
          <span className="text-xs font-medium text-blue-400">
            {[deviceStatus.heater, deviceStatus.cooler, deviceStatus.mister].filter(Boolean).length}/3 运行
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-400 font-semibold mt-2 mb-1 flex items-center gap-1">
        <ThunderboltOutlined className="text-yellow-400" />
        设备状态
      </div>
      <div className="space-y-1">
        {([
          { key: 'heater' as const, label: '加热棒', icon: '🔥', color: 'text-red-400' },
          { key: 'cooler' as const, label: '制冷片', icon: '❄️', color: 'text-blue-400' },
          { key: 'mister' as const, label: '雾化系统', icon: '💨', color: 'text-cyan-400' },
        ]).map((dev) => (
          <div key={dev.key} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1">
            <span className="text-xs text-gray-300">{dev.icon} {dev.label}</span>
            <span className={`text-[10px] font-medium ${deviceStatus[dev.key] ? dev.color : 'text-gray-600'}`}>
              {deviceStatus[dev.key] ? '● 运行' : '○ 停止'}
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 font-semibold mt-2 mb-1 flex items-center gap-1">
        <AlertOutlined className="text-orange-400" />
        传感器报警
      </div>
      <div className="space-y-0.5">
        {SENSOR_CONFIG.map((config) => {
          const alarm = isAlarm(config.key);
          return (
            <div key={config.key} className="flex items-center justify-between px-1 py-0.5">
              <span className="text-[10px] text-gray-400">{config.icon} {config.label}</span>
              <span className={`text-[10px] ${alarm ? 'text-red-400' : 'text-green-500'}`}>
                {alarm ? '⚠ 异常' : '✓ 正常'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('monitor');
  const selectedDevice = useAppStore((s) => s.selectedDevice);
  const setSelectedDevice = useAppStore((s) => s.setSelectedDevice);

  useMqttData();
  useAlarmSound();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#1a1a2e',
          colorBgElevated: '#16213e',
          colorBorder: '#333',
          colorText: '#e0e0e0',
          borderRadius: 6,
        },
      }}
    >
      <div className="h-screen w-screen flex flex-col bg-[#0a1628] overflow-hidden">
        <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-gray-800 bg-gray-900/50 overflow-hidden flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <SensorPanel />
            </div>
            <div className="border-t border-gray-800 bg-gray-900/70 max-h-64 overflow-y-auto custom-scrollbar">
              <QuickStatus />
            </div>
          </div>
          <div className="flex-1 relative">
            <SceneCanvas />
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-400">
              鼠标左键旋转 | 右键平移 | 滚轮缩放 | 点击设备查看详情
            </div>
          </div>
          <div className="w-80 border-l border-gray-800 bg-gray-900/50 overflow-hidden flex-shrink-0">
            <RightPanel activeTab={activeTab} />
          </div>
        </div>
      </div>
      <DeviceDetailModal
        visible={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />
    </ConfigProvider>
  );
}
