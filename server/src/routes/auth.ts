import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Thiếu username hoặc password.' });
    }

    const username = parsed.data.username.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }
    if (user.status === 'LOCKED') {
      return reply.code(403).send({ error: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa.' });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = await reply.jwtSign({ sub: user.id, role: user.role, dojoId: user.dojoId, username: user.username });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        dojoId: user.dojoId,
        phone: user.phone,
        email: user.email
      }
    };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, username: true, fullName: true, role: true, dojoId: true, phone: true, email: true, status: true }
    });
    if (!user || user.status !== 'ACTIVE') {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }
    return { user };
  });
}
