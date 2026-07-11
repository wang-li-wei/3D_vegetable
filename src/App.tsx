import { useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import {
  ThunderboltOutlined,
  DashboardOutlined,
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
import { useDataSync } from '@/hooks/useDataSync';
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

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="glass-section-label flex items-center" style={{ gap: 6 }}>
        <DashboardOutlined style={{ color: '#00E5FF', fontSize: 12, display: 'flex', alignItems: 'center' }} />
        <span style={{ lineHeight: '16px' }}>快捷状态</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card" style={{ padding: '10px 16px' }}>
          <div className="glass-label" style={{ lineHeight: '16px' }}>连接状态</div>
          <div className="flex items-center" style={{ gap: 6, marginTop: 4 }}>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: system.connected ? '#00FF88' : '#FF4757',
                boxShadow: system.connected
                  ? '0 0 6px rgba(0,255,136,0.5)'
                  : '0 0 6px rgba(255,71,87,0.5)',
              }}
            />
            <span
              style={{ fontSize: 12, fontWeight: 600, color: system.connected ? '#00FF88' : '#FF4757', lineHeight: '18px' }}
            >
              {system.connected ? '在线' : '离线'}
            </span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '10px 16px' }}>
          <div className="glass-label" style={{ lineHeight: '16px' }}>生长阶段</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#00E5FF', lineHeight: '18px', marginTop: 4, display: 'block' }}>
            {stageLabels[growthStage]} · D{growthDay}
          </span>
        </div>
        <div className="glass-card" style={{ padding: '10px 16px' }}>
          <div className="glass-label" style={{ lineHeight: '16px' }}>报警</div>
          <span
            style={{ fontSize: 12, fontWeight: 600, color: activeAlarmCount > 0 ? '#FF4757' : '#00FF88', lineHeight: '18px', marginTop: 4, display: 'block' }}
          >
            {activeAlarmCount > 0 ? `${activeAlarmCount}个活跃` : '全部正常'}
          </span>
        </div>
        <div className="glass-card" style={{ padding: '10px 16px' }}>
          <div className="glass-label" style={{ lineHeight: '16px' }}>设备</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#00E5FF', lineHeight: '18px', marginTop: 4, display: 'block' }}>
            {[deviceStatus.heater, deviceStatus.cooler, deviceStatus.mister, deviceStatus.pump].filter(Boolean).length}/4 运行
          </span>
        </div>
      </div>

      <div className="glass-section-label flex items-center" style={{ gap: 6 }}>
        <ThunderboltOutlined style={{ color: '#00E5FF', fontSize: 12, display: 'flex', alignItems: 'center' }} />
        <span style={{ lineHeight: '16px' }}>设备状态</span>
      </div>
      <div className="space-y-1.5">
        {([
          { key: 'heater' as const, label: '加热棒', icon: '🔥' },
          { key: 'cooler' as const, label: '制冷片', icon: '❄️' },
          { key: 'mister' as const, label: '雾化系统', icon: '💨' },
          { key: 'pump' as const, label: '水泵', icon: '💧' },
        ]).map((dev) => (
          <div
            key={dev.key}
            className={`flex items-center justify-between ${
              deviceStatus[dev.key] ? 'glass-btn-active' : ''
            }`}
            style={{
              padding: '8px 16px',
              borderRadius: 2,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              background: deviceStatus[dev.key]
                ? 'rgba(0, 229, 255, 0.12)'
                : 'rgba(8, 24, 58, 0.50)',
              border: `1px solid ${deviceStatus[dev.key] ? 'rgba(0, 229, 255, 0.30)' : 'rgba(0, 229, 255, 0.08)'}`,
            }}
          >
            <span style={{ fontSize: 12, color: '#B0C8E0', lineHeight: '18px' }}>
              {dev.icon} {dev.label}
            </span>
            <span
              style={{ fontSize: 10, fontWeight: 600, color: deviceStatus[dev.key] ? '#00E5FF' : 'rgba(176, 200, 224, 0.35)', lineHeight: '14px' }}
            >
              {deviceStatus[dev.key] ? '● 运行' : '○ 停止'}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-section-label flex items-center" style={{ gap: 6 }}>
        <AlertOutlined style={{ color: '#00E5FF', fontSize: 12, display: 'flex', alignItems: 'center' }} />
        <span style={{ lineHeight: '16px' }}>传感器报警</span>
      </div>
      <div className="space-y-1">
        {SENSOR_CONFIG.map((config) => {
          const alarm = isAlarm(config.key);
          return (
            <div
              key={config.key}
              className="flex items-center justify-between"
              style={{ padding: '4px 8px' }}
            >
              <span className="glass-label" style={{ lineHeight: '16px' }}>
                {config.icon} {config.label}
              </span>
              <span
                style={{ fontSize: 10, fontWeight: 600, color: alarm ? '#FF4757' : '#00FF88', lineHeight: '14px' }}
              >
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
  useDataSync();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00E5FF',
          colorBgContainer: 'rgba(6, 18, 44, 0.85)',
          colorBgElevated: 'rgba(8, 24, 58, 0.90)',
          colorBorder: 'rgba(0, 229, 255, 0.15)',
          colorText: '#B0C8E0',
          borderRadius: 4,
        },
      }}
    >
      <div className="h-screen w-screen flex flex-col bg-[#060D1F] overflow-hidden scan-line-enabled">
        <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex overflow-hidden">
          <div
            className="glass-panel-container overflow-y-auto custom-scrollbar flex-shrink-0"
            style={{ width: 340 }}
          >
            <SensorPanel />
            <div style={{ borderTop: '1px solid rgba(0, 229, 255, 0.08)' }}>
              <QuickStatus />
            </div>
          </div>
          <div className="flex-1 relative">
            <SceneCanvas />
            <div
              className="absolute top-3 left-3 glass-device-label"
              style={{ fontSize: 11 }}
            >
              鼠标左键旋转 | 右键平移 | 滚轮缩放 | 点击设备查看详情
            </div>
          </div>
          <div
            className="glass-panel-container-right overflow-hidden flex-shrink-0"
            style={{ width: 320 }}
          >
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
