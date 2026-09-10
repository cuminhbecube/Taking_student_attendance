import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Thiếu username hoặc password.' });
    }

    const username = parsed.data.username.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { username }, include: { dojo: true } });
    if (!user) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }
    if (user.status === 'LOCKED') {
      return reply.code(403).send({ error: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa.' });
    }
    if (user.dojo && user.dojo.status === 'LOCKED') {
      return reply.code(403).send({ error: 'DOJO_LOCKED', message: 'Võ đường đang bị khóa.' });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = await reply.jwtSign(
      { sub: user.id, role: user.role, dojoId: user.dojoId, username: user.username },
      { expiresIn: '12h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        dojoId: user.dojoId,
        phone: user.phone,
        email: user.email,
        status: user.status
      }
    };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { dojo: { select: { id: true, code: true, name: true, status: true } } }
    });
    if (!user || user.status !== 'ACTIVE' || (user.dojo && user.dojo.status !== 'ACTIVE')) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        dojoId: user.dojoId,
        phone: user.phone,
        email: user.email,
        status: user.status,
        dojo: user.dojo
      }
    };
  });

  app.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user || user.status !== 'ACTIVE') return reply.code(401).send({ error: 'UNAUTHORIZED' });
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return reply.code(400).send({ error: 'CURRENT_PASSWORD_INVALID', message: 'Mật khẩu hiện tại không đúng.' });
    if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) {
      return reply.code(400).send({ error: 'PASSWORD_REUSED', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.auditLog.create({ data: { dojoId: user.dojoId, actorUserId: user.id, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id } })
    ]);
    return { success: true };
  });
}
