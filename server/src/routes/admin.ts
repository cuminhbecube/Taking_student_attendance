import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, resolveDojoScope } from '../middleware/auth.js';

const dojoSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(2).max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(30).optional()
});

const userSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6).max(128),
  fullName: z.string().min(2).max(200),
  role: z.enum(['DOJO_ADMIN', 'TEACHER', 'COACH']),
  dojoId: z.string().min(1),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional()
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  role: z.enum(['DOJO_ADMIN', 'TEACHER', 'COACH']).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(['ACTIVE', 'LOCKED']).optional()
});

const permissionSchema = z.object({
  canViewTuition: z.boolean(),
  canEditTuition: z.boolean(),
  canEditSchedule: z.boolean(),
  canTakeAttendance: z.boolean(),
  canAddStudent: z.boolean(),
  canEditStudentInfo: z.boolean(),
  canDeleteStudent: z.boolean(),
  canAddDateSession: z.boolean(),
  canExportData: z.boolean()
});

function canAdminDojo(request: any, dojoId: string) {
  return request.user.role === 'SUPER_ADMIN' || (request.user.role === 'DOJO_ADMIN' && request.user.dojoId === dojoId);
}

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/dojos', { preHandler: [requireRole('SUPER_ADMIN')] }, async () => {
    const dojos = await prisma.dojo.findMany({ orderBy: { name: 'asc' } });
    return { dojos };
  });

  app.post('/dojos', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const parsed = dojoSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const dojo = await prisma.dojo.create({
      data: { ...parsed.data, code: parsed.data.code.trim().toUpperCase() }
    });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId: dojo.id, action: 'DOJO_CREATED', entityType: 'Dojo', entityId: dojo.id, metadata: { code: dojo.code, name: dojo.name } } });
    return reply.code(201).send({ dojo });
  });

  app.patch('/dojos/:dojoId', { preHandler: [requireRole('SUPER_ADMIN')] }, async (request, reply) => {
    const { dojoId } = request.params as { dojoId: string };
    const parsed = dojoSchema.partial().extend({ status: z.enum(['ACTIVE', 'LOCKED']).optional() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const existing = await prisma.dojo.findUnique({ where: { id: dojoId } });
    if (!existing) return reply.code(404).send({ error: 'DOJO_NOT_FOUND' });
    const dojo = await prisma.dojo.update({ where: { id: dojoId }, data: { ...parsed.data, code: parsed.data.code?.trim().toUpperCase() } });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId, action: 'DOJO_UPDATED', entityType: 'Dojo', entityId: dojoId, metadata: { status: dojo.status } } });
    return { dojo };
  });

  app.get('/users', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string };
    const dojoId = resolveDojoScope(request, query.dojoId);
    if (!dojoId) return { users: [] };
    const users = await prisma.user.findMany({
      where: { dojoId },
      select: { id: true, username: true, fullName: true, role: true, dojoId: true, phone: true, email: true, status: true, createdAt: true, lastLoginAt: true },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }]
    });
    return { users };
  });

  app.post('/users', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const parsed = userSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    if (!canAdminDojo(request, parsed.data.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (request.user.role === 'DOJO_ADMIN' && parsed.data.role === 'DOJO_ADMIN') return reply.code(403).send({ error: 'FORBIDDEN', message: 'Chỉ Super Admin được tạo quản trị võ đường.' });
    const dojo = await prisma.dojo.findUnique({ where: { id: parsed.data.dojoId } });
    if (!dojo) return reply.code(404).send({ error: 'DOJO_NOT_FOUND' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({ data: { username: parsed.data.username.toLowerCase(), passwordHash, fullName: parsed.data.fullName, role: parsed.data.role, dojoId: parsed.data.dojoId, phone: parsed.data.phone, email: parsed.data.email } });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId: parsed.data.dojoId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, metadata: { username: user.username, role: user.role } } });
    return reply.code(201).send({ user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, dojoId: user.dojoId, phone: user.phone, email: user.email, status: user.status } });
  });

  app.patch('/users/:userId', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || !target.dojoId) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    if (!canAdminDojo(request, target.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (request.user.role === 'DOJO_ADMIN' && (target.role === UserRole.DOJO_ADMIN || parsed.data.role === 'DOJO_ADMIN')) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (target.id === request.user.sub && parsed.data.status === 'LOCKED') return reply.code(400).send({ error: 'CANNOT_LOCK_SELF' });
    const user = await prisma.user.update({ where: { id: userId }, data: parsed.data });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId: target.dojoId, action: 'USER_UPDATED', entityType: 'User', entityId: user.id, metadata: { role: user.role, status: user.status } } });
    return { user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, dojoId: user.dojoId, phone: user.phone, email: user.email, status: user.status } };
  });

  app.post('/users/:userId/password', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const parsed = z.object({ password: z.string().min(6).max(128) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT' });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || !target.dojoId) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    if (!canAdminDojo(request, target.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (request.user.role === 'DOJO_ADMIN' && target.role === UserRole.DOJO_ADMIN) return reply.code(403).send({ error: 'FORBIDDEN' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId: target.dojoId, action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: userId } });
    return { success: true };
  });

  app.get('/permissions', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string };
    const dojoId = resolveDojoScope(request, query.dojoId);
    if (!dojoId) return { permissions: [] };
    const permissions = await prisma.rolePermission.findMany({ where: { dojoId, role: { in: [UserRole.TEACHER, UserRole.COACH] } }, orderBy: { role: 'asc' } });
    return { permissions };
  });

  app.put('/permissions/:role', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const { role } = request.params as { role: string };
    if (role !== 'TEACHER' && role !== 'COACH') return reply.code(400).send({ error: 'INVALID_ROLE' });
    const body = (request.body ?? {}) as Record<string, unknown>;
    const dojoId = resolveDojoScope(request, typeof body.dojoId === 'string' ? body.dojoId : undefined);
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });
    const parsed = permissionSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const permission = await prisma.rolePermission.upsert({ where: { dojoId_role: { dojoId, role } }, update: parsed.data, create: { dojoId, role, ...parsed.data } });
    await prisma.auditLog.create({ data: { actorUserId: request.user.sub, dojoId, action: 'ROLE_PERMISSION_UPDATED', entityType: 'RolePermission', entityId: permission.id, metadata: { role } } });
    return { permission };
  });

  app.get('/audit', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string; limit?: string; action?: string };
    const dojoId = resolveDojoScope(request, query.dojoId);
    if (!dojoId) return { auditLogs: [] };
    const limit = Math.min(Math.max(Number(query.limit || 100), 1), 500);
    const auditLogs = await prisma.auditLog.findMany({ where: { dojoId, ...(query.action ? { action: query.action } : {}) }, include: { actor: { select: { username: true, fullName: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: limit });
    return { auditLogs };
  });
}
