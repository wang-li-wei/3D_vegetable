import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ZodError, type ZodSchema } from 'zod';
import { config } from './utils/config.js';
import { startMqtt } from './services/mqttService.js';
import { ensurePartitions, startRetentionCron } from './utils/partitions.js';
import { ensureDefaultAdmin } from './routes/authRoutes.js';

import authRoutes from './routes/authRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import alarmRoutes from './routes/alarmRoutes.js';
import farmLogRoutes from './routes/farmLogRoutes.js';
import thresholdRoutes from './routes/thresholdRoutes.js';
import systemConfigRoutes from './routes/systemConfigRoutes.js';
import controlRoutes from './routes/controlRoutes.js';
import { authRequired, requireRole } from './utils/auth.js';

const app = express();
app.set('trust proxy', 1);

// === 安全中间件 ===
app.use(
  helmet({
    contentSecurityPolicy: false, // 前端 SPA，由 Nginx 处理
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());

// CORS：白名单（多 origin 逗号分隔）
const allowedOrigins = (config.corsOrigin || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // 同源请求（无 origin）放行
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('CORS not allowed'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// 全局限流：每 IP 每 15 分钟最多 1000 次
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests' },
  })
);

// 鉴权路由限流：每 IP 每分钟最多 10 次登录（防爆破）
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts' },
});

// 请求日志（仅方法 + 路径 + IP，不打 body 避免泄漏）
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[API] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// === Zod body 校验工具 ===
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => `${String(i.path.join('.'))}: ${i.message}`)
        .join('; ');
      return res.status(400).json({ success: false, error: `Invalid body: ${msg}` });
    }
    req.body = result.data;
    next();
  };
}

// === 公开路由 ===
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === 受保护路由 ===
app.use('/api/sensors', authRequired, sensorRoutes);
app.use('/api/device', authRequired, deviceRoutes);
app.use('/api/alarms', authRequired, alarmRoutes);
app.use('/api/farm-logs', authRequired, farmLogRoutes);
app.use('/api/thresholds', authRequired, thresholdRoutes);
app.use('/api/config', authRequired, systemConfigRoutes);
// 控制命令仅管理员可下发
app.use('/api/control', authRequired, requireRole('admin'), controlRoutes);

// === 错误处理 ===
// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// 统一错误 —— 不外泄内部错误细节
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Error:', err);
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, error: 'Validation failed' });
  }
  // 不返回 err.message 给客户端，避免泄漏内部信息
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// === 启动 ===
async function bootstrap() {
  try {
    await ensurePartitions();
    await ensureDefaultAdmin();
  } catch (err) {
    console.error('[Bootstrap] Failed:', err);
  }
  startRetentionCron();
  app.listen(config.port, () => {
    console.log(`[Server] Running on port ${config.port}`);
    startMqtt();
  });
}

bootstrap();
