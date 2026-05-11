import { useState } from 'react';
import { Card, Tag, Button, Table, Modal, InputNumber, Typography, Badge, Space } from 'antd';
import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/useAppStore';
import { SENSOR_CONFIG } from '@/utils/constants';
import type { AlarmRecord, ThresholdConfig, SensorData } from '@/types';
import dayjs from 'dayjs';

const { Text } = Typography;

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
      title={<span className="text-gray-200">阈值设置</span>}
      open={visible}
      onCancel={onClose}
      onOk={onClose}
      okText="确定"
      cancelText="取消"
      className="dark-modal"
    >
      <div className="space-y-3">
        {SENSOR_CONFIG.map((config) => (
          <div key={config.key} className="flex items-center gap-3">
            <span className="text-gray-400 text-sm w-24">{config.label}</span>
            <div className="flex items-center gap-2">
              <Text className="text-gray-500 text-xs">下限</Text>
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
                className="w-20"
              />
              <Text className="text-gray-500 text-xs">上限</Text>
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
                className="w-20"
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
        <span className="text-gray-400 text-xs">{dayjs(ts).format('HH:mm:ss')}</span>
      ),
    },
    {
      title: '报警内容',
      dataIndex: 'message',
      key: 'message',
      render: (msg: string) => (
        <span className="text-gray-300 text-xs">{msg}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 70,
      render: (status: string, record) => (
        <Space size={4}>
          <Tag
            color={
              status === 'active'
                ? 'error'
                : status === 'ignored'
                ? 'warning'
                : 'success'
            }
            className="text-xs m-0"
          >
            {status === 'active' ? '活跃' : status === 'ignored' ? '已忽略' : '已处理'}
          </Tag>
          {status === 'active' && (
            <Button
              type="link"
              size="small"
              className="text-xs p-0"
              onClick={() => updateAlarmStatus(record.id, 'ignored')}
            >
              忽略
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto px-2 py-1 custom-scrollbar">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Badge count={alarmCount} size="small" offset={[6, 0]}>
            <BellOutlined className="text-blue-400" />
          </Badge>
          <Text className="text-gray-300 text-sm font-semibold">报警通知</Text>
        </div>
        <Space size={8}>
          <Button
            type="text"
            size="small"
            icon={<SoundOutlined />}
            className={soundEnabled ? 'text-blue-400' : 'text-gray-600'}
            onClick={() => setSoundEnabled(!soundEnabled)}
          />
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            className="text-blue-400"
            onClick={() => setSettingsVisible(true)}
          />
        </Space>
      </div>

      {alarmCount > 0 && (
        <Card
          size="small"
          className="mb-2 bg-red-900/30 border-red-700 animate-pulse"
        >
          <div className="flex items-center gap-2">
            <AlertOutlined className="text-red-400 text-lg" />
            <div>
              <div className="text-red-400 text-sm font-bold">
                {alarmCount}个活跃报警
              </div>
              <div className="text-red-300/60 text-xs">
                {activeAlarms[0]?.message}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Table
        dataSource={alarms.slice(0, 20)}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        className="alarm-table"
        rowClassName={(record) =>
          record.status === 'active' ? 'bg-red-900/10' : ''
        }
      />

      <ThresholdSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </div>
  );
}
