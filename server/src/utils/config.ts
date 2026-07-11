import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  mqttBroker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  mqttSubscribeTopic: process.env.MQTT_SUBSCRIBE_TOPIC || '/lettuce/sensor/data',
  mqttPublishTopic: process.env.MQTT_PUBLISH_TOPIC || '/lettuce/control/command',
};
