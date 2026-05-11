import mqtt from 'mqtt';

const BROKER_URL = process.env.MQTT_BROKER || 'ws://localhost:8083/mqtt';
const TOPIC = '/lettuce/sensor/data';
const INTERVAL_MS = 2000;

function randomInRange(min: number, max: number): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(1));
}

function generateData() {
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour <= 18;

  return {
    device_id: 'esp32_001',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      air_temp: randomInRange(isDaytime ? 22 : 16, isDaytime ? 30 : 22),
      air_hum: randomInRange(55, 80),
      nutrient_temp: randomInRange(18, 22),
      light: parseFloat(randomInRange(isDaytime ? 300 : 0, isDaytime ? 800 : 50).toFixed(0)),
      ph: randomInRange(5.8, 6.4),
    },
    status: {
      heater: Math.random() > 0.7,
      cooler: Math.random() > 0.8,
      mister: Math.random() > 0.5,
    },
  };
}

console.log(`Connecting to MQTT broker: ${BROKER_URL}`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `simulator_${Math.random().toString(16).slice(3)}`,
  clean: true,
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  console.log(`Publishing to topic: ${TOPIC}`);
  console.log(`Interval: ${INTERVAL_MS}ms`);

  setInterval(() => {
    const data = generateData();
    client.publish(TOPIC, JSON.stringify(data), { qos: 1 });
    console.log(
      `Published: temp=${data.data.air_temp}℃ hum=${data.data.air_hum}% ph=${data.data.ph}`
    );
  }, INTERVAL_MS);
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

client.on('close', () => {
  console.log('MQTT connection closed');
});

process.on('SIGINT', () => {
  console.log('\nShutting down simulator...');
  client.end();
  process.exit(0);
});
