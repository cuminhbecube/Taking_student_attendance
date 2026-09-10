import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const classSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  activeDays: z.array(z.number().int().min(1).max(7)).default([]),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  venue: z.string().max(300).optional(),
  instructorName: z.string().max(200).optional()
});

function canAccess(request: any, dojoId: string) {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}

export async function classRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async request => {
    const query = (request.query ?? {}) as { dojoId?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { classes: [] };
    const classes = await prisma.dojoClass.findMany({
      where: { dojoId },
      include: { _count: { select: { enrollments: true, sessions: true } } },
      orderBy: { name: 'asc' }
    });
    return { classes };
  });

  app.get('/:classId', async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const dojoClass = await prisma.dojoClass.findUnique({
      where: { id: classId },
      include: { enrollments: { where: { endedAt: null }, include: { student: true } }, _count: { select: { sessions: true } } }
    });
    if (!dojoClass) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (!canAccess(request, dojoClass.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    return { class: dojoClass };
  });

  app.post('/', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const body = (request.body ?? {}) as z.infer<typeof classSchema> & { dojoId?: string };
    const parsed = classSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const dojoId = request.user.role === 'SUPER_ADMIN' ? body.dojoId : request.user.dojoId;
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });
    const dojo = await prisma.dojo.findUnique({ where: { id: dojoId } });
    if (!dojo) return reply.code(404).send({ error: 'DOJO_NOT_FOUND' });
    const dojoClass = await prisma.$transaction(async tx => {
      const value = await tx.dojoClass.create({ data: { dojoId, ...parsed.data, code: parsed.data.code.trim().toUpperCase() } });
      await tx.auditLog.create({ data: { dojoId, actorUserId: request.user.sub, action: 'CLASS_CREATED', entityType: 'DojoClass', entityId: value.id, metadata: { code: value.code, name: value.name } } });
      return value;
    });
    return reply.code(201).send({ class: dojoClass });
  });

  app.patch('/:classId', { preHandler: [requirePermission('canEditSchedule')] }, async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const parsed = classSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const existing = await prisma.dojoClass.findUnique({ where: { id: classId } });
    if (!existing) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (!canAccess(request, existing.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    const dojoClass = await prisma.$transaction(async tx => {
      const value = await tx.dojoClass.update({ where: { id: classId }, data: { ...parsed.data, code: parsed.data.code?.trim().toUpperCase() } });
      await tx.auditLog.create({ data: { dojoId: existing.dojoId, actorUserId: request.user.sub, action: 'CLASS_UPDATED', entityType: 'DojoClass', entityId: classId, metadata: { fields: Object.keys(parsed.data) } } });
      return value;
    });
    return { class: dojoClass };
  });

  app.delete('/:classId', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const existing = await prisma.dojoClass.findUnique({ where: { id: classId }, include: { _count: { select: { sessions: true, enrollments: true } } } });
    if (!existing) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (!canAccess(request, existing.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (existing._count.sessions > 0) return reply.code(409).send({ error: 'CLASS_HAS_HISTORY', message: 'Không thể xóa lớp đã có lịch sử điểm danh.' });
    await prisma.$transaction([
      prisma.classEnrollment.deleteMany({ where: { classId } }),
      prisma.dojoClass.delete({ where: { id: classId } }),
      prisma.auditLog.create({ data: { dojoId: existing.dojoId, actorUserId: request.user.sub, action: 'CLASS_DELETED', entityType: 'DojoClass', entityId: classId, metadata: { code: existing.code, name: existing.name } } })
    ]);
    return reply.code(204).send();
  });
}
