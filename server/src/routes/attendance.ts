import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

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
  lateMinutes: z.number().int().min(0).max(240).optional(),
  expectedUpdatedAt: z.string().datetime().optional()
});

const bulkSchema = z.object({ records: z.array(markSchema).min(1).max(500) });

function canAccess(request: any, dojoId: string) {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}

function normalizeSessionDay(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

async function validateMark(session: any, data: z.infer<typeof markSchema>) {
  const [student, registeredClass] = await Promise.all([
    prisma.student.findUnique({ where: { id: data.studentId } }),
    prisma.dojoClass.findUnique({ where: { id: data.registeredClassId } })
  ]);
  if (!student || !registeredClass || student.dojoId !== session.dojoId || registeredClass.dojoId !== session.dojoId) {
    return { error: 'TENANT_MISMATCH' as const };
  }
  if (data.type === 'NORMAL' && registeredClass.id !== session.classId) return { error: 'NORMAL_CLASS_MISMATCH' as const };
  if (data.type === 'MAKEUP' && registeredClass.id === session.classId) return { error: 'MAKEUP_REQUIRES_ORIGIN_CLASS' as const };
  if (data.type !== 'TRIAL') {
    const enrollment = await prisma.classEnrollment.findFirst({ where: { studentId: student.id, classId: registeredClass.id, endedAt: null } });
    if (!enrollment) return { error: 'ACTIVE_ENROLLMENT_REQUIRED' as const };
  }
  return { student, registeredClass };
}

function hasWriteConflict(oldRecord: { updatedAt: Date } | null, expectedUpdatedAt?: string) {
  if (!oldRecord || !expectedUpdatedAt) return false;
  const expected = new Date(expectedUpdatedAt);
  return Number.isNaN(expected.getTime()) || oldRecord.updatedAt.getTime() !== expected.getTime();
}

export async function attendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/sessions', async (request, reply) => {
    const query = (request.query ?? {}) as { dojoId?: string; classId?: string; from?: string; to?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { sessions: [] };
    if (query.classId) {
      const dojoClass = await prisma.dojoClass.findUnique({ where: { id: query.classId } });
      if (!dojoClass) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
      if (dojoClass.dojoId !== dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });
    }
    const from = query.from ? normalizeSessionDay(query.from) : undefined;
    const toDay = query.to ? normalizeSessionDay(query.to) : undefined;
    if ((query.from && !from) || (query.to && !toDay)) return reply.code(400).send({ error: 'INVALID_DATE_RANGE' });
    const toExclusive = toDay ? new Date(toDay.getTime() + 86_400_000) : undefined;
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        dojoId,
        ...(query.classId ? { classId: query.classId } : {}),
        ...((from || toExclusive) ? { sessionDate: { ...(from ? { gte: from } : {}), ...(toExclusive ? { lt: toExclusive } : {}) } } : {})
      },
      include: { class: true, _count: { select: { records: true } } },
      orderBy: { sessionDate: 'desc' }
    });
    return { sessions };
  });

  app.post('/sessions', { preHandler: [requirePermission('canAddDateSession')] }, async (request, reply) => {
    const parsed = sessionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const dojoClass = await prisma.dojoClass.findUnique({ where: { id: parsed.data.classId } });
    if (!dojoClass) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (!canAccess(request, dojoClass.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    const sessionDate = normalizeSessionDay(parsed.data.sessionDate);
    if (!sessionDate) return reply.code(400).send({ error: 'INVALID_DATE' });
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
      include: { class: true, records: { include: { student: true, registeredClass: true }, orderBy: { student: { name: 'asc' } } } }
    });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (!canAccess(request, session.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    return { session };
  });

  app.put('/sessions/:sessionId/records', { preHandler: [requirePermission('canTakeAttendance')] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const parsed = markSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (!canAccess(request, session.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (session.isFinalized) return reply.code(409).send({ error: 'SESSION_FINALIZED', message: 'Buổi điểm danh đã khóa sổ.' });
    const validated = await validateMark(session, parsed.data);
    if ('error' in validated) return reply.code(400).send({ error: validated.error });

    const oldRecord = await prisma.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId, studentId: validated.student.id } } });
    if (hasWriteConflict(oldRecord, parsed.data.expectedUpdatedAt)) {
      return reply.code(409).send({
        error: 'ATTENDANCE_CONFLICT',
        message: 'Bản ghi đã được thiết bị khác cập nhật. Hãy tải lại trước khi sửa.',
        currentRecord: oldRecord
      });
    }

    const record = await prisma.$transaction(async tx => {
      const saved = await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId: validated.student.id } },
        update: { status: parsed.data.status, type: parsed.data.type, registeredClassId: validated.registeredClass.id, attendedClassId: session.classId, checkedAt: new Date(), checkedByUserId: request.user.sub, note: parsed.data.note, lateMinutes: parsed.data.status === 'LATE' ? parsed.data.lateMinutes ?? 0 : null },
        create: { sessionId, studentId: validated.student.id, status: parsed.data.status, type: parsed.data.type, registeredClassId: validated.registeredClass.id, attendedClassId: session.classId, checkedByUserId: request.user.sub, note: parsed.data.note, lateMinutes: parsed.data.status === 'LATE' ? parsed.data.lateMinutes ?? 0 : null }
      });
      await tx.auditLog.create({ data: { dojoId: session.dojoId, actorUserId: request.user.sub, action: oldRecord ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_CREATED', entityType: 'AttendanceRecord', entityId: saved.id, metadata: { sessionId, studentId: validated.student.id, oldStatus: oldRecord?.status ?? null, newStatus: saved.status, attendanceType: saved.type } } });
      return saved;
    });
    return { record };
  });

  app.put('/sessions/:sessionId/records/bulk', { preHandler: [requirePermission('canTakeAttendance')] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const parsed = bulkSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (!canAccess(request, session.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (session.isFinalized) return reply.code(409).send({ error: 'SESSION_FINALIZED' });

    const validatedRows: Array<{ data: z.infer<typeof markSchema>; studentId: string; registeredClassId: string; oldRecord: any }> = [];
    for (const data of parsed.data.records) {
      const validated = await validateMark(session, data);
      if ('error' in validated) return reply.code(400).send({ error: validated.error, studentId: data.studentId });
      const oldRecord = await prisma.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId, studentId: validated.student.id } } });
      if (hasWriteConflict(oldRecord, data.expectedUpdatedAt)) {
        return reply.code(409).send({ error: 'ATTENDANCE_CONFLICT', studentId: data.studentId, currentRecord: oldRecord });
      }
      validatedRows.push({ data, studentId: validated.student.id, registeredClassId: validated.registeredClass.id, oldRecord });
    }

    const records = await prisma.$transaction(async tx => {
      const out = [];
      for (const row of validatedRows) {
        const saved = await tx.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId, studentId: row.studentId } },
          update: { status: row.data.status, type: row.data.type, registeredClassId: row.registeredClassId, attendedClassId: session.classId, checkedAt: new Date(), checkedByUserId: request.user.sub, note: row.data.note, lateMinutes: row.data.status === 'LATE' ? row.data.lateMinutes ?? 0 : null },
          create: { sessionId, studentId: row.studentId, status: row.data.status, type: row.data.type, registeredClassId: row.registeredClassId, attendedClassId: session.classId, checkedByUserId: request.user.sub, note: row.data.note, lateMinutes: row.data.status === 'LATE' ? row.data.lateMinutes ?? 0 : null }
        });
        out.push(saved);
      }
      await tx.auditLog.create({ data: { dojoId: session.dojoId, actorUserId: request.user.sub, action: 'ATTENDANCE_BULK_UPDATED', entityType: 'AttendanceSession', entityId: session.id, metadata: { count: out.length } } });
      return out;
    });
    return { records };
  });

  app.post('/sessions/:sessionId/finalize', { preHandler: [requirePermission('canAddDateSession')] }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return reply.code(404).send({ error: 'SESSION_NOT_FOUND' });
    if (!canAccess(request, session.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    if (session.isFinalized) return { session };
    const updated = await prisma.$transaction(async tx => {
      const value = await tx.attendanceSession.update({ where: { id: sessionId }, data: { isFinalized: true, finalizedAt: new Date(), finalizedBy: request.user.sub } });
      await tx.auditLog.create({ data: { dojoId: session.dojoId, actorUserId: request.user.sub, action: 'ATTENDANCE_SESSION_FINALIZED', entityType: 'AttendanceSession', entityId: session.id } });
      return value;
    });
    return { session: updated };
  });
}
