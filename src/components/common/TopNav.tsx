import { Badge, Tag, Switch, Typography, Space } from 'antd';
import {
  ApiOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';

const { Text } = Typography;

type TabKey = 'monitor' | 'control' | 'alarm' | 'growth' | 'stats';

interface TopNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'monitor', label: '环境监测', icon: <DashboardOutlined /> },
  { key: 'control', label: '智能控制', icon: <ExperimentOutlined /> },
  { key: 'alarm', label: '报警通知', icon: <BellOutlined /> },
  { key: 'growth', label: '生长管理', icon: <CloudServerOutlined /> },
  { key: 'stats', label: '数据统计', icon: <BarChartOutlined /> },
];

export default function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const system = useAppStore((s) => s.system);
  const setSimulationMode = useAppStore((s) => s.setSimulationMode);
  const alarms = useAppStore((s) => s.alarms);
  const activeAlarmCount = alarms.filter((a) => a.status === 'active').length;

  return (
    <div className="h-12 bg-gray-900/95 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ApiOutlined className="text-blue-400 text-xl" />
          <Text className="text-blue-400 font-bold text-base tracking-wide">
            生菜水培数字孪生平台
          </Text>
        </div>
        <div className="flex items-center gap-1 ml-6">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`px-3 py-1.5 rounded cursor-pointer transition-all text-sm flex items-center gap-1 ${
                activeTab === tab.key
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.key === 'alarm' && activeAlarmCount > 0 && (
                <Badge count={activeAlarmCount} size="small" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Space size={8}>
          <Tag
            icon={<ApiOutlined />}
            color={system.connected ? 'success' : 'error'}
            className="m-0"
          >
            {system.connected ? '已连接' : '未连接'}
          </Tag>
          <Tag className="m-0 bg-gray-800 border-gray-600">
            设备 {system.onlineDevices}/{system.totalDevices}
          </Tag>
          {activeAlarmCount > 0 && (
            <Tag color="error" className="m-0">
              报警 {activeAlarmCount}
            </Tag>
          )}
        </Space>
        <div className="flex items-center gap-2">
          <Text className="text-gray-500 text-xs">模拟模式</Text>
          <Switch
            size="small"
            checked={system.simulationMode}
            onChange={setSimulationMode}
          />
        </div>
      </div>
    </div>
  );
}
