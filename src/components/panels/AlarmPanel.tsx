import { useState } from 'react';
import { Button, Table, Modal, InputNumber, Badge, Space } from 'antd';
import {
  AlertOutlined,
  BellOutlined,
  SettingOutlined,
  SoundOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { AlarmRecord, ThresholdConfig } from '@/types';
import dayjs from 'dayjs';

function ThresholdSettings({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const thresholds = useAppStore((s) => s.thresholds);
  const setThresholds = useAppStore((s) => s.setThresholds);

  return (
    <Modal
      title={<span style={{ color: '#E8F4FF', fontWeight: 600 }}>阈值设置</span>}
      open={visible}
      onCancel={onClose}
      onOk={onClose}
      okText="确定"
      cancelText="取消"
      className="glass-modal"
    >
      <div className="space-y-3">
        {SENSOR_CONFIG.map((config) => (
          <div key={config.key} className="flex items-center gap-3">
            <span className="glass-label" style={{ width: 96 }}>{config.label}</span>
            <div className="flex items-center gap-2">
              <span className="glass-label" style={{ fontSize: 10 }}>下限</span>
              <InputNumber
                size="small"
                value={thresholds[config.key].min}
                onChange={(v) =>
                  v !== null &&
                  setThresholds({
                    [config.key]: {
                      ...thresholds[config.key],
                      min: v,
                    },
                  } as Partial<ThresholdConfig>)
                }
                step={0.1}
                className="glass-input"
                style={{ width: 72 }}
              />
              <span className="glass-label" style={{ fontSize: 10 }}>上限</span>
              <InputNumber
                size="small"
                value={thresholds[config.key].max}
                onChange={(v) =>
                  v !== null &&
                  setThresholds({
                    [config.key]: {
                      ...thresholds[config.key],
                      max: v,
                    },
                  } as Partial<ThresholdConfig>)
                }
                step={0.1}
                className="glass-input"
                style={{ width: 72 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function AlarmPanel() {
  const alarms = useAppStore((s) => s.alarms);
  const updateAlarmStatus = useAppStore((s) => s.updateAlarmStatus);
  const markAllAlarmsRead = useAppStore((s) => s.markAllAlarmsRead);
  const soundEnabled = useAppStore((s) => s.system.soundEnabled);
  const setSoundEnabled = useAppStore((s) => s.setSoundEnabled);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const activeAlarms = alarms.filter((a) => a.status === 'active');
  const alarmCount = activeAlarms.length;

  const columns: ColumnsType<AlarmRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 80,
      render: (ts: number) => (
        <span className="glass-label" style={{ fontSize: 11 }}>
          {dayjs(ts).format('HH:mm:ss')}
        </span>
      ),
    },
    {
      title: '报警内容',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => (
        <span style={{ color: '#B0C8E0', fontSize: 12 }}>{msg}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (status: string, record) => (
        <Space size={4}>
          <span
            className="glass-tag"
            style={{
              background:
                status === 'active'
                  ? 'rgba(255, 71, 87, 0.15)'
                  : status === 'read'
                  ? 'rgba(176, 200, 224, 0.10)'
                  : 'rgba(0, 255, 136, 0.12)',
              borderColor:
                status === 'active'
                  ? 'rgba(255, 71, 87, 0.30)'
                  : status === 'read'
                  ? 'rgba(176, 200, 224, 0.15)'
                  : 'rgba(0, 255, 136, 0.25)',
              color:
                status === 'active'
                  ? '#FF4757'
                  : status === 'read'
                  ? 'rgba(176, 200, 224, 0.50)'
                  : '#00FF88',
              fontSize: 10,
              padding: '1px 6px',
            }}
          >
            {status === 'active' ? '活跃' : status === 'read' ? '已读' : '已处理'}
          </span>
          {status === 'active' && (
            <Button
              type="link"
              size="small"
              style={{ fontSize: 10, padding: 0, color: '#00E5FF' }}
              onClick={() => updateAlarmStatus(record.id, 'read')}
            >
              已读
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center" style={{ gap: 8 }}>
          <Badge count={alarmCount} size="small" offset={[6, 0]}>
            <BellOutlined style={{ color: '#00E5FF', fontSize: 16, display: 'flex', alignItems: 'center' }} />
          </Badge>
          <span className="glass-title" style={{ lineHeight: '22px' }}>报警通知</span>
        </div>
        <Space size={8}>
          {alarmCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#00E5FF', display: 'flex', alignItems: 'center', fontSize: 12 }}
              onClick={markAllAlarmsRead}
            >
              一键已读
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<SoundOutlined />}
            style={{ color: soundEnabled ? '#00E5FF' : 'rgba(176, 200, 224, 0.30)', display: 'flex', alignItems: 'center' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          />
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            style={{ color: '#00E5FF', display: 'flex', alignItems: 'center' }}
            onClick={() => setSettingsVisible(true)}
          />
        </Space>
      </div>

      {alarmCount > 0 && (
        <div
          className="glass-card-alarm animate-pulse-glow-red mb-3"
          style={{ padding: '12px 16px' }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <AlertOutlined style={{ color: '#FF4757', fontSize: 20, display: 'flex', alignItems: 'center', lineHeight: 1 }} />
            <div>
              <div style={{ color: '#FF4757', fontSize: 14, fontWeight: 700, lineHeight: '20px' }}>
                {alarmCount}个活跃报警
              </div>
              <div style={{ color: 'rgba(255, 71, 87, 0.65)', fontSize: 12, lineHeight: '18px' }}>
                {activeAlarms[0]?.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <Table
        dataSource={alarms.slice(0, 20)}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        className="alarm-table"
        rowClassName={(record) =>
          record.status === 'active' ? 'glass-card-alarm' : ''
        }
      />

      <ThresholdSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </div>
  );
}
