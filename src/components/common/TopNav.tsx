import { Badge } from 'antd';
import {
  ApiOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';

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
  const alarms = useAppStore((s) => s.alarms);
  const activeAlarmCount = alarms.filter((a) => a.status === 'active').length;

  const isSystemOk = system.connected && system.onlineDevices > 0;

  return (
    <div
      className="h-16 flex items-center justify-between px-5"
      style={{
        background: 'rgba(6, 18, 44, 0.90)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.04), inset 0 1px 0 rgba(0, 229, 255, 0.06)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center" style={{ gap: 8 }}>
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{
              background: 'rgba(0, 229, 255, 0.12)',
              border: '1px solid rgba(0, 229, 255, 0.30)',
              boxShadow: '0 0 12px rgba(0, 229, 255, 0.15)',
              borderRadius: 2,
            }}
          >
            <ApiOutlined style={{ color: '#00E5FF', fontSize: 16 }} />
          </div>
          <span
            style={{
              color: '#E8F4FF',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.08em',
              lineHeight: '24px',
            }}
          >
            生菜水培数字孪生平台
          </span>
        </div>
        <div className="flex items-center gap-1 ml-4">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="cursor-pointer flex items-center"
              style={{
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: '6px 14px',
                gap: 6,
                background:
                  activeTab === tab.key
                    ? 'rgba(0, 229, 255, 0.12)'
                    : 'transparent',
                border: `1px solid ${
                  activeTab === tab.key
                    ? 'rgba(0, 229, 255, 0.30)'
                    : 'transparent'
                }`,
                color:
                  activeTab === tab.key ? '#00E5FF' : 'rgba(176, 200, 224, 0.50)',
                fontWeight: activeTab === tab.key ? 600 : 500,
                fontSize: 13,
                lineHeight: '20px',
                letterSpacing: '0.04em',
                boxShadow:
                  activeTab === tab.key
                    ? '0 0 12px rgba(0, 229, 255, 0.08), inset 0 0 8px rgba(0, 229, 255, 0.04)'
                    : 'none',
                borderRadius: 2,
              }}
              onClick={() => onTabChange(tab.key)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.06)';
                  e.currentTarget.style.color = '#B0C8E0';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(176, 200, 224, 0.50)';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'alarm' && activeAlarmCount > 0 && (
                <Badge count={activeAlarmCount} size="small" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 8 }}>
        <span
          className="glass-tag"
          style={{
            background: isSystemOk
              ? 'rgba(0, 255, 136, 0.12)'
              : system.connected
              ? 'rgba(255, 184, 0, 0.12)'
              : 'rgba(255, 71, 87, 0.15)',
            borderColor: isSystemOk
              ? 'rgba(0, 255, 136, 0.25)'
              : system.connected
              ? 'rgba(255, 184, 0, 0.25)'
              : 'rgba(255, 71, 87, 0.30)',
            color: isSystemOk ? '#00FF88' : system.connected ? '#FFB800' : '#FF4757',
            lineHeight: '18px',
          }}
        >
          <ApiOutlined style={{ fontSize: 10 }} />
          {isSystemOk ? '已连接' : system.connected ? '等待数据' : '未连接'}
        </span>
        {system.connected && system.onlineDevices === 0 && (
          <span className="glass-tag" style={{ lineHeight: '18px', background: 'rgba(255,184,0,0.12)', borderColor: 'rgba(255,184,0,0.25)', color: '#FFB800' }}>
            无设备
          </span>
        )}
        {system.onlineDevices > 0 && (
          <span className="glass-tag" style={{ lineHeight: '18px' }}>
            设备 {system.onlineDevices}/{system.totalDevices}
          </span>
        )}
        {activeAlarmCount > 0 && (
          <span
            className="glass-tag glass-tag-danger"
            style={{ lineHeight: '18px' }}
          >
            报警 {activeAlarmCount}
          </span>
        )}
      </div>
    </div>
  );
}
