import { useState } from 'react';
import {
  Button,
  Progress,
  Timeline,
  Modal,
  Input,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { GROWTH_STAGES } from '@/utils/constants';
import dayjs from 'dayjs';

function GrowthStatus() {
  const growthStage = useAppStore((s) => s.growthStage);
  const growthDay = useAppStore((s) => s.growthDay);
  const sensorData = useAppStore((s) => s.sensorData);
  const plantingDate = useAppStore((s) => s.plantingDate);

  const stageConfig = GROWTH_STAGES[growthStage];
  const totalDays = 45;
  const progress = Math.min((growthDay / totalDays) * 100, 100);

  const accumulatedTemp = growthDay * sensorData.air_temp;
  const estimatedHarvestDays = Math.max(0, Math.ceil(
    (1200 - accumulatedTemp) / Math.max(sensorData.air_temp, 1)
  ));
  const estimatedWeight = Math.min(
    growthDay <= 14 ? growthDay * 2 : growthDay <= 35 ? 28 + (growthDay - 14) * 5 : 133 + (growthDay - 35) * 3,
    200
  );

  return (
    <div
      className="glass-card mb-3"
      style={{ padding: '14px 16px' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center" style={{ gap: 8 }}>
          <CalendarOutlined style={{ color: '#00E5FF', fontSize: 14, display: 'flex', alignItems: 'center' }} />
          <span style={{ color: '#B0C8E0', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>
            {stageConfig.label}
          </span>
        </div>
        <span
          className="glass-tag glass-tag-success"
          style={{ fontSize: 10 }}
        >
          {stageConfig.label}
        </span>
      </div>

      <Progress
        percent={progress}
        strokeColor="#00E5FF"
        railColor="rgba(0, 229, 255, 0.08)"
        size="small"
        format={() => (
          <span style={{ color: '#E8F4FF', fontSize: 11, fontWeight: 600 }}>
            第{growthDay}天
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <span className="glass-label">种植日期</span>
          <div style={{ color: '#B0C8E0', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
            {plantingDate}
          </div>
        </div>
        <div>
          <span className="glass-label">预计收获</span>
          <div style={{ color: '#00FF88', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
            {estimatedHarvestDays > 0 ? `约${estimatedHarvestDays}天后` : '可收获'}
          </div>
        </div>
        <div>
          <span className="glass-label">积温</span>
          <div style={{ color: '#00E5FF', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
            {accumulatedTemp.toFixed(0)}℃·d
          </div>
        </div>
        <div>
          <span className="glass-label">预估产量</span>
          <div style={{ color: '#FFB800', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
            {estimatedWeight.toFixed(0)}g/株
          </div>
        </div>
      </div>
    </div>
  );
}

function FarmLogPanel() {
  const farmLogs = useAppStore((s) => s.farmLogs);
  const addFarmLog = useAppStore((s) => s.addFarmLog);
  const [addVisible, setAddVisible] = useState(false);
  const [logContent, setLogContent] = useState('');

  const handleAddLog = () => {
    if (!logContent.trim()) return;
    addFarmLog({
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      type: 'manual',
      content: logContent,
    });
    setLogContent('');
    setAddVisible(false);
  };

  return (
    <div
      className="glass-card"
      style={{ padding: '4px 16px' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ padding: '10px 0', borderBottom: '1px solid rgba(0, 229, 255, 0.08)' }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <CalendarOutlined style={{ color: '#00E5FF', fontSize: 13, display: 'flex', alignItems: 'center' }} />
          <span className="glass-title" style={{ fontSize: 12, lineHeight: '18px' }}>农事日志</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          style={{ color: '#00E5FF' }}
          onClick={() => setAddVisible(true)}
        />
      </div>
      <div className="max-h-40 overflow-y-auto custom-scrollbar py-2">
        <Timeline
          items={farmLogs.slice(0, 10).map((log) => ({
            color: log.type === 'auto' ? '#00E5FF' : '#00FF88',
            content: (
              <div>
                <div className="glass-label" style={{ fontSize: 10 }}>
                  {dayjs(log.date).format('MM-DD HH:mm')}
                </div>
                <div style={{ color: '#B0C8E0', fontSize: 12 }}>{log.content}</div>
              </div>
            ),
          }))}
        />
      </div>

      <Modal
        title={<span style={{ color: '#E8F4FF', fontWeight: 600 }}>添加农事记录</span>}
        open={addVisible}
        onOk={handleAddLog}
        onCancel={() => setAddVisible(false)}
        okText="保存"
        cancelText="取消"
        className="glass-modal"
      >
        <Input.TextArea
          rows={3}
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          placeholder="请输入农事操作记录..."
          className="glass-input mt-2"
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
}

export default function GrowthPanel() {
  return (
    <div className="h-full overflow-y-auto px-3 py-3 custom-scrollbar">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="glass-title" style={{ lineHeight: '22px' }}>生长管理</span>
        <EditOutlined style={{ color: '#00E5FF', fontSize: 16, display: 'flex', alignItems: 'center' }} />
      </div>
      <GrowthStatus />
      <FarmLogPanel />
    </div>
  );
}
