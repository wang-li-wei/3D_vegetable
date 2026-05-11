import { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Progress,
  Timeline,
  Modal,
  Input,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { GROWTH_STAGES } from '@/utils/constants';
import type { GrowthStage, FarmLog } from '@/types';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

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
    <Card size="small" className="bg-gray-800/60 border-gray-700 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarOutlined style={{ color: stageConfig.color }} />
          <Text className="text-gray-300 text-sm">{stageConfig.label}</Text>
        </div>
        <Tag color={stageConfig.color}>{stageConfig.label}</Tag>
      </div>

      <Progress
        percent={progress}
        strokeColor={stageConfig.color}
        railColor="#333"
        size="small"
        format={() => `第${growthDay}天`}
      />

      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <span className="text-gray-500">种植日期</span>
          <div className="text-gray-300">{plantingDate}</div>
        </div>
        <div>
          <span className="text-gray-500">预计收获</span>
          <div className="text-green-400">
            {estimatedHarvestDays > 0 ? `约${estimatedHarvestDays}天后` : '可收获'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">积温</span>
          <div className="text-blue-400">{accumulatedTemp.toFixed(0)}℃·d</div>
        </div>
        <div>
          <span className="text-gray-500">预估产量</span>
          <div className="text-yellow-400">{estimatedWeight.toFixed(0)}g/株</div>
        </div>
      </div>
    </Card>
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
    <Card
      size="small"
      className="bg-gray-800/60 border-gray-700"
      title={
        <span className="text-gray-300 text-xs">
          <CalendarOutlined className="mr-1" />
          农事日志
        </span>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          className="text-blue-400"
          onClick={() => setAddVisible(true)}
        />
      }
    >
      <div className="max-h-40 overflow-y-auto custom-scrollbar">
        <Timeline
          items={farmLogs.slice(0, 10).map((log) => ({
            color: log.type === 'auto' ? 'blue' : 'green',
            content: (
              <div>
                <div className="text-gray-500 text-[10px]">
                  {dayjs(log.date).format('MM-DD HH:mm')}
                </div>
                <div className="text-gray-300 text-xs">{log.content}</div>
              </div>
            ),
          }))}
        />
      </div>

      <Modal
        title={<span className="text-gray-200">添加农事记录</span>}
        open={addVisible}
        onOk={handleAddLog}
        onCancel={() => setAddVisible(false)}
        okText="保存"
        cancelText="取消"
        className="dark-modal"
      >
        <TextArea
          rows={3}
          value={logContent}
          onChange={(e) => setLogContent(e.target.value)}
          placeholder="请输入农事操作记录..."
          className="mt-2"
        />
      </Modal>
    </Card>
  );
}

export default function GrowthPanel() {
  return (
    <div className="h-full overflow-y-auto px-2 py-1 custom-scrollbar">
      <div className="flex items-center justify-between mb-3 px-1">
        <Text className="text-gray-300 text-sm font-semibold">生长管理</Text>
        <EditOutlined className="text-blue-400" />
      </div>
      <GrowthStatus />
      <FarmLogPanel />
    </div>
  );
}
