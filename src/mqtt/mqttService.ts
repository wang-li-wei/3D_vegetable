import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import type { MqttMessage, ControlCommand } from '@/types';
import { MQTT_CONFIG } from '@/utils/constants';

type MessageHandler = (message: MqttMessage) => void;
type StatusHandler = (connected: boolean) => void;

// 心跳配置：30s 内没有 message 视为离线
const HEARTBEAT_TIMEOUT_MS = 30_000;
// 重连重试上限：30 次 * 3s = 90s 后通知离线
const RECONNECT_MAX_ATTEMPTS = 30;

class MqttService {
  private client: MqttClient | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private connected = false;
  private brokerUrl: string = MQTT_CONFIG.defaultBroker;

  connect(brokerUrl?: string): void {
    if (brokerUrl) this.brokerUrl = brokerUrl;
    if (this.client?.connected) return;

    this.dispose();

    this.client = mqtt.connect(this.brokerUrl, {
      clientId: `web_${Math.random().toString(16).slice(3)}`,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
      protocolVersion: 4,
      keepalive: 30,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.notifyStatus(true);
      this.client?.subscribe(MQTT_CONFIG.subscribeTopic, { qos: 1 });
      this.armHeartbeat();
    });

    this.client.on('message', (_topic, payload) => {
      this.armHeartbeat(); // 每次收到数据就续命
      try {
        const message = JSON.parse(payload.toString()) as MqttMessage;
        this.messageHandlers.forEach((h) => h(message));
      } catch {
        console.error('Failed to parse MQTT message');
      }
    });

    // 错误/关闭事件：暂不立即标记离线，给 mqtt.js 重连机会
    this.client.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    this.client.on('close', () => {
      this.connected = false;
      this.clearHeartbeat();
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts += 1;
      if (this.reconnectAttempts > RECONNECT_MAX_ATTEMPTS) {
        // 多次重连失败，通知离线
        this.notifyStatus(false);
        this.client?.end(true);
      }
    });

    this.client.on('offline', () => {
      this.connected = false;
    });
  }

  disconnect(): void {
    this.dispose();
    this.connected = false;
    this.notifyStatus(false);
  }

  publishCommand(command: ControlCommand): void {
    if (!this.client?.connected) {
      console.warn('MQTT not connected, command not sent');
      return;
    }
    this.client.publish(
      MQTT_CONFIG.publishTopic,
      JSON.stringify(command),
      { qos: 1 }
    );
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((h) => h(connected));
  }

  private armHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      // 30s 没收到任何 message：视为上游 ESP32 离线
      console.warn('MQTT heartbeat timeout, marking offline');
      this.notifyStatus(false);
      // 不断连接接 broker，由它继续自动重连
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private dispose(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end();
      this.client = null;
    }
    this.reconnectAttempts = 0;
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

export const mqttService = new MqttService();
