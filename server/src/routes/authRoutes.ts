import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler, success, error } from '../utils/response.js';
import { signToken, verifyPassword, hashPassword, authRequired, type AuthedRequest } from '../utils/auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(2).max(64),
  password: z.string().min(6).max(128),
});

/** POST /api/auth/login */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return error(res, `Invalid input: ${parsed.error.issues[0]?.message ?? ''}`);
    }
    const { username, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return error(res, 'Invalid credentials', 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return error(res, 'Invalid credentials', 401);
    const token = signToken({ sub: user.username, role: user.role as 'admin' | 'user' });
    success(res, { token, user: { username: user.username, role: user.role } });
  })
);

/** GET /api/auth/me */
router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    success(res, { username: authed.user!.sub, role: authed.user!.role });
  })
);

/** 内部用：首次启动创建默认管理员（用户名 admin，密码从 env 读） */
export async function ensureDefaultAdmin() {
  const username = process.env.DEFAULT_ADMIN_USER || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return;
  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { username, passwordHash, role: 'admin' } });
  console.log(`[Auth] Created default admin: ${username} (please change password!)`);
}

export default router;
