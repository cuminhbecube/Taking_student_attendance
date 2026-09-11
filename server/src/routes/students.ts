import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const studentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  belt: z.string().max(100).optional(),
  dob: z.string().optional(),
  parentPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional()
});

const enrollmentSchema = z.object({
  classId: z.string().min(1),
  isPrimary: z.boolean().default(true)
});

function getDojoId(request: any, requested?: string) {
  return request.user.role === 'SUPER_ADMIN' ? requested ?? null : request.user.dojoId;
}

function canAccess(request: any, dojoId: string) {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}

export function normalizeVietnameseSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, match => match === 'Đ' ? 'D' : 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function studentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async request => {
    const query = (request.query ?? {}) as { q?: string; dojoId?: string; classId?: string; includeInactive?: string };
    const dojoId = getDojoId(request, query.dojoId);
    if (!dojoId) return { students: [] };

    const students = await prisma.student.findMany({
      where: {
        dojoId,
        ...(query.includeInactive === 'true' ? {} : { isActive: true }),
        ...(query.classId ? { enrollments: { some: { classId: query.classId, endedAt: null } } } : {})
      },
      include: {
        enrollments: {
          where: { endedAt: null },
          include: { class: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    if (!query.q?.trim()) return { students };
    const needle = normalizeVietnameseSearch(query.q);
    const filtered = students.filter(student => normalizeVietnameseSearch([
      student.code,
      student.name,
      student.parentPhone ?? '',
      student.belt ?? ''
    ].join(' ')).includes(needle));
    return { students: filtered };
  });

  app.get('/:studentId', async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { enrollments: { include: { class: true }, orderBy: { startedAt: 'desc' } } }
    });
    if (!student) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!canAccess(request, student.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    return { student };
  });

  app.post('/', { preHandler: [requirePermission('canAddStudent')] }, async (request, reply) => {
    const body = (request.body ?? {}) as z.infer<typeof studentSchema> & { dojoId?: string; classId?: string };
    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const dojoId = getDojoId(request, body.dojoId);
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });
    const dob = parsed.data.dob ? new Date(parsed.data.dob) : undefined;
    if (dob && Number.isNaN(dob.getTime())) return reply.code(400).send({ error: 'INVALID_DOB' });

    if (body.classId) {
      const dojoClass = await prisma.dojoClass.findUnique({ where: { id: body.classId } });
      if (!dojoClass || dojoClass.dojoId !== dojoId) return reply.code(400).send({ error: 'CLASS_TENANT_MISMATCH' });
    }

    const student = await prisma.$transaction(async tx => {
      const created = await tx.student.create({
        data: {
          dojoId,
          code: parsed.data.code.trim(),
          name: parsed.data.name.trim(),
          belt: parsed.data.belt,
          dob,
          parentPhone: parsed.data.parentPhone,
          notes: parsed.data.notes
        }
      });
      if (body.classId) await tx.classEnrollment.create({ data: { classId: body.classId, studentId: created.id, isPrimary: true } });
      await tx.auditLog.create({ data: { dojoId, actorUserId: request.user.sub, action: 'STUDENT_CREATED', entityType: 'Student', entityId: created.id, metadata: { code: created.code, name: created.name, classId: body.classId ?? null } } });
      return created;
    });

    return reply.code(201).send({ student });
  });

  app.patch('/:studentId', { preHandler: [requirePermission('canEditStudentInfo')] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const parsed = studentSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const existing = await prisma.student.findUnique({ where: { id: studentId } });
    if (!existing) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!canAccess(request, existing.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    const dob = parsed.data.dob ? new Date(parsed.data.dob) : undefined;
    if (dob && Number.isNaN(dob.getTime())) return reply.code(400).send({ error: 'INVALID_DOB' });
    const student = await prisma.$transaction(async tx => {
      const value = await tx.student.update({ where: { id: studentId }, data: { ...parsed.data, dob } });
      await tx.auditLog.create({ data: { dojoId: existing.dojoId, actorUserId: request.user.sub, action: 'STUDENT_UPDATED', entityType: 'Student', entityId: studentId, metadata: { fields: Object.keys(parsed.data) } } });
      return value;
    });
    return { student };
  });

  app.delete('/:studentId', { preHandler: [requirePermission('canDeleteStudent')] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const existing = await prisma.student.findUnique({ where: { id: studentId } });
    if (!existing) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!canAccess(request, existing.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    await prisma.$transaction([
      prisma.student.update({ where: { id: studentId }, data: { isActive: false } }),
      prisma.classEnrollment.updateMany({ where: { studentId, endedAt: null }, data: { endedAt: new Date() } }),
      prisma.auditLog.create({ data: { dojoId: existing.dojoId, actorUserId: request.user.sub, action: 'STUDENT_DEACTIVATED', entityType: 'Student', entityId: studentId } })
    ]);
    return reply.code(204).send();
  });

  app.post('/:studentId/enrollments', { preHandler: [requirePermission('canEditSchedule')] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const parsed = enrollmentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT' });
    const [student, dojoClass] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.dojoClass.findUnique({ where: { id: parsed.data.classId } })
    ]);
    if (!student) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!dojoClass) return reply.code(404).send({ error: 'CLASS_NOT_FOUND' });
    if (student.dojoId !== dojoClass.dojoId || !canAccess(request, student.dojoId)) return reply.code(403).send({ error: 'TENANT_MISMATCH' });
    const existing = await prisma.classEnrollment.findFirst({ where: { classId: dojoClass.id, studentId, endedAt: null } });
    if (existing) return { enrollment: existing };

    const enrollment = await prisma.$transaction(async tx => {
      if (parsed.data.isPrimary) await tx.classEnrollment.updateMany({ where: { studentId, endedAt: null, isPrimary: true }, data: { isPrimary: false } });
      const value = await tx.classEnrollment.create({ data: { classId: dojoClass.id, studentId, isPrimary: parsed.data.isPrimary } });
      await tx.auditLog.create({ data: { dojoId: student.dojoId, actorUserId: request.user.sub, action: 'STUDENT_ENROLLED', entityType: 'ClassEnrollment', entityId: value.id, metadata: { studentId, classId: dojoClass.id, isPrimary: parsed.data.isPrimary } } });
      return value;
    });
    return reply.code(201).send({ enrollment });
  });

  app.delete('/:studentId/enrollments/:enrollmentId', { preHandler: [requirePermission('canEditSchedule')] }, async (request, reply) => {
    const { studentId, enrollmentId } = request.params as { studentId: string; enrollmentId: string };
    const enrollment = await prisma.classEnrollment.findUnique({ where: { id: enrollmentId }, include: { student: true } });
    if (!enrollment || enrollment.studentId !== studentId) return reply.code(404).send({ error: 'ENROLLMENT_NOT_FOUND' });
    if (!canAccess(request, enrollment.student.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });
    const updated = await prisma.classEnrollment.update({ where: { id: enrollmentId }, data: { endedAt: new Date() } });
    await prisma.auditLog.create({ data: { dojoId: enrollment.student.dojoId, actorUserId: request.user.sub, action: 'STUDENT_UNENROLLED', entityType: 'ClassEnrollment', entityId: enrollmentId, metadata: { studentId, classId: enrollment.classId } } });
    return { enrollment: updated };
  });
}
