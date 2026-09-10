import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const sessionSchema = z.object({
  classId: z.string().min(1),
  sessionDate: z.string().min(1),
  title: z.string().max(200).optional()
});

const markSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  type: z.enum(['NORMAL', 'MAKEUP', 'TRIAL']).default('NORMAL'),
  registeredClassId: z.string().min(1),
  note: z.string().max(1000).optional(),
  lateMinutes: z.number().int().min(0).max(240).optional()
});

export async function attendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.post('/sessions', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER')] }, async (request, reply) => {
    const parsed = sessionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const dojoClass = await prisma.dojoClass.findUnique({ where: { id: parsed.data.classId } });
    if (!dojoClass) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && dojoClass.dojoId !== request.user.dojoId) {
      return reply.code(403).send({ error: 'FORBIDDEN' });
    }

    const sessionDate = new Date(parsed.data.sessionDate);
    if (Number.isNaN(sessionDate.getTime())) return reply.code(400).send({ error: 'INVALID_DATE' });

    const session = await prisma.attendanceSession.upsert({
      where: { classId_sessionDate: { classId: dojoClass.id, sessionDate } },
      update: { title: parsed.data.title },
      create: { dojoId: dojoClass.dojoId, classId: dojoClass.id, sessionDate, title: parsed.data.title }
    });

    return reply.code(201).send({ session });
  });

  app.get('/sessions/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: true, records: { include: { student: true }, orderBy: { student: { name: 'asc' } } } }
    });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && session.dojoId !== request.user.dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });
    return { session };
  });

  app.put('/sessions/:sessionId/records', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER', 'COACH')] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const parsed = markSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && session.dojoId !== request.user.dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (session.isFinalized) return reply.code(409).send({ error: 'SESSION_FINALIZED', message: 'Buổi điểm danh đã khóa sổ.' });

    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId } });
    const registeredClass = await prisma.dojoClass.findUnique({ where: { id: parsed.data.registeredClassId } });
    if (!student || !registeredClass || student.dojoId !== session.dojoId || registeredClass.dojoId !== session.dojoId) {
      return reply.code(400).send({ error: 'TENANT_MISMATCH' });
    }

    const oldRecord = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } }
    });

    const record = await prisma.$transaction(async tx => {
      const saved = await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: student.id } },
        update: {
          status: parsed.data.status,
          type: parsed.data.type,
          registeredClassId: registeredClass.id,
          attendedClassId: session.classId,
          checkedAt: new Date(),
          checkedByUserId: request.user.sub,
          note: parsed.data.note,
          lateMinutes: parsed.data.status === 'LATE' ? parsed.data.lateMinutes ?? 0 : null
        },
        create: {
          sessionId,
          studentId: student.id,
          status: parsed.data.status,
          type: parsed.data.type,
          registeredClassId: registeredClass.id,
          attendedClassId: session.classId,
          checkedByUserId: request.user.sub,
          note: parsed.data.note,
          lateMinutes: parsed.data.status === 'LATE' ? parsed.data.lateMinutes ?? 0 : null
        }
      });

      await tx.auditLog.create({
        data: {
          dojoId: session.dojoId,
          actorUserId: request.user.sub,
          action: oldRecord ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_CREATED',
          entityType: 'AttendanceRecord',
          entityId: saved.id,
          metadata: {
            sessionId,
            studentId: student.id,
            oldStatus: oldRecord?.status ?? null,
            newStatus: saved.status,
            attendanceType: saved.type
          }
        }
      });
      return saved;
    });

    return { record };
  });

  app.post('/sessions/:sessionId/finalize', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER')] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && session.dojoId !== request.user.dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });

    const updated = await prisma.$transaction(async tx => {
      const value = await tx.attendanceSession.update({
        where: { id: sessionId },
        data: { isFinalized: true, finalizedAt: new Date(), finalizedBy: request.user.sub }
      });
      await tx.auditLog.create({
        data: {
          dojoId: session.dojoId,
          actorUserId: request.user.sub,
          action: 'ATTENDANCE_SESSION_FINALIZED',
          entityType: 'AttendanceSession',
          entityId: session.id
        }
      });
      return value;
    });

    return { session: updated };
  });
}
