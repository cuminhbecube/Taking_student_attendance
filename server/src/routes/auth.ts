import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });

const allPermissions = {
  canViewTuition: true,
  canEditTuition: true,
  canEditSchedule: true,
  canTakeAttendance: true,
  canAddStudent: true,
  canEditStudentInfo: true,
  canDeleteStudent: true,
  canAddDateSession: true,
  canExportData: true
};

async function effectivePermissions(role: UserRole, dojoId: string | null) {
  if (role === 'SUPER_ADMIN' || role === 'DOJO_ADMIN') return allPermissions;
  if (!dojoId) return Object.fromEntries(Object.keys(allPermissions).map(key => [key, false]));
  const row = await prisma.rolePermission.findUnique({ where: { dojoId_role: { dojoId, role } } });
  if (!row) return Object.fromEntries(Object.keys(allPermissions).map(key => [key, false]));
  return {
    canViewTuition: row.canViewTuition,
    canEditTuition: row.canEditTuition,
    canEditSchedule: row.canEditSchedule,
    canTakeAttendance: row.canTakeAttendance,
    canAddStudent: row.canAddStudent,
    canEditStudentInfo: row.canEditStudentInfo,
    canDeleteStudent: row.canDeleteStudent,
    canAddDateSession: row.canAddDateSession,
    canExportData: row.canExportData
  };
}

function setSessionCookie(reply: any, token: string) {
  reply.setCookie('ea_session', token, {
    path: '/api',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 12
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', message: 'Thiếu username hoặc password.' });

    const username = parsed.data.username.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { username }, include: { dojo: true } });
    if (!user) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    if (user.status === 'LOCKED') return reply.code(403).send({ error: 'ACCOUNT_LOCKED', message: 'Tài khoản đã bị khóa.' });
    if (user.dojo && user.dojo.status === 'LOCKED') return reply.code(403).send({ error: 'DOJO_LOCKED', message: 'Võ đường đang bị khóa.' });

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = await reply.jwtSign({ sub: user.id, role: user.role, dojoId: user.dojoId, username: user.username }, { expiresIn: '12h' });
    setSessionCookie(reply, token);
    return {
      token,
      user: {
        id: user.id, username: user.username, fullName: user.fullName, role: user.role,
        dojoId: user.dojoId, phone: user.phone, email: user.email, status: user.status,
        dojo: user.dojo ? { id: user.dojo.id, code: user.dojo.code, name: user.dojo.name, status: user.dojo.status } : null,
        permissions: await effectivePermissions(user.role, user.dojoId)
      }
    };
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('ea_session', { path: '/api' });
    return { success: true };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub }, include: { dojo: { select: { id: true, code: true, name: true, status: true } } } });
    if (!user || user.status !== 'ACTIVE' || (user.dojo && user.dojo.status !== 'ACTIVE')) return reply.code(401).send({ error: 'UNAUTHORIZED' });
    return {
      user: {
        id: user.id, username: user.username, fullName: user.fullName, role: user.role,
        dojoId: user.dojoId, phone: user.phone, email: user.email, status: user.status,
        dojo: user.dojo,
        permissions: await effectivePermissions(user.role, user.dojoId)
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
    if (await bcrypt.compare(parsed.data.newPassword, user.passwordHash)) return reply.code(400).send({ error: 'PASSWORD_REUSED', message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.auditLog.create({ data: { dojoId: user.dojoId, actorUserId: user.id, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id } })
    ]);
    return { success: true };
  });
}
