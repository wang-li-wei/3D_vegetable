import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import type { MqttMessage, ControlCommand } from '@/types';
import { MQTT_CONFIG } from '@/utils/constants';

type MessageHandler = (message: MqttMessage) => void;
type StatusHandler = (connected: boolean) => void;

class MqttService {
  private client: MqttClient | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private brokerUrl: string = MQTT_CONFIG.defaultBroker;

  connect(brokerUrl?: string): void {
    if (brokerUrl) this.brokerUrl = brokerUrl;
    if (this.client?.connected) return;

    this.client = mqtt.connect(this.brokerUrl, {
      clientId: `web_${Math.random().toString(16).slice(3)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
    });

    this.client.on('connect', () => {
      this.notifyStatus(true);
      this.client?.subscribe(MQTT_CONFIG.subscribeTopic, { qos: 1 });
      this.client?.subscribe(MQTT_CONFIG.statusTopic, { qos: 1 });
    });

    this.client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString()) as MqttMessage;
        this.messageHandlers.forEach((h) => h(message));
      } catch {
        console.error('Failed to parse MQTT message');
      }
    });

    this.client.on('error', (err) => {
      console.error('MQTT error:', err);
      this.notifyStatus(false);
    });

    this.client.on('close', () => {
      this.notifyStatus(false);
    });

    this.client.on('reconnect', () => {
      console.log('MQTT reconnecting...');
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      this.client.end();
      this.client = null;
    }
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

  get isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}

export const mqttService = new MqttService();
