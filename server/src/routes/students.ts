import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const optionalText = (max: number) => z.string().max(max).nullable().optional();

const studentFieldsSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  belt: optionalText(100),
  dob: z.string().nullable().optional(),
  parentPhone: optionalText(30),
  contactName: optionalText(200),
  address: optionalText(500),
  notes: optionalText(2000),
  isActive: z.boolean().optional()
});

const createStudentSchema = studentFieldsSchema.extend({
  dojoId: z.string().min(1).optional(),
  classId: z.string().min(1).optional()
}).strict();

const updateStudentSchema = studentFieldsSchema.partial().extend({
  expectedUpdatedAt: z.string().datetime().optional()
}).strict();

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

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseDob(value: string | null | undefined): { value?: Date | null; error?: string } {
  if (value === undefined) return { value: undefined };
  if (value === null || value.trim() === '') return { value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: 'INVALID_DOB' };
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return { error: 'INVALID_DOB' };
  if (date.getTime() > Date.now()) return { error: 'DOB_IN_FUTURE' };
  return { value: date };
}

function studentSnapshot(student: any) {
  return {
    code: student.code,
    name: student.name,
    gender: student.gender ?? null,
    belt: student.belt ?? null,
    dob: student.dob ? new Date(student.dob).toISOString().slice(0, 10) : null,
    parentPhone: student.parentPhone ?? null,
    contactName: student.contactName ?? null,
    address: student.address ?? null,
    notes: student.notes ?? null,
    isActive: student.isActive
  };
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
      student.contactName ?? '',
      student.address ?? '',
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
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const dojoId = getDojoId(request, parsed.data.dojoId);
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });
    const code = parsed.data.code.trim();
    const name = parsed.data.name.trim();
    if (!code || !name) return reply.code(400).send({ error: 'INVALID_INPUT' });
    const dobResult = parseDob(parsed.data.dob);
    if (dobResult.error) return reply.code(400).send({ error: dobResult.error });

    const duplicate = await prisma.student.findFirst({ where: { dojoId, code } });
    if (duplicate) return reply.code(409).send({ error: 'STUDENT_CODE_EXISTS' });

    if (parsed.data.classId) {
      const dojoClass = await prisma.dojoClass.findUnique({ where: { id: parsed.data.classId } });
      if (!dojoClass || dojoClass.dojoId !== dojoId) return reply.code(400).send({ error: 'CLASS_TENANT_MISMATCH' });
    }

    try {
      const student = await prisma.$transaction(async tx => {
        const created = await tx.student.create({
          data: {
            dojoId,
            code,
            name,
            gender: parsed.data.gender ?? null,
            belt: normalizeOptionalText(parsed.data.belt),
            dob: dobResult.value,
            parentPhone: normalizeOptionalText(parsed.data.parentPhone),
            contactName: normalizeOptionalText(parsed.data.contactName),
            address: normalizeOptionalText(parsed.data.address),
            notes: normalizeOptionalText(parsed.data.notes),
            isActive: parsed.data.isActive ?? true
          }
        });
        if (parsed.data.classId) await tx.classEnrollment.create({ data: { classId: parsed.data.classId, studentId: created.id, isPrimary: true } });
        await tx.auditLog.create({
          data: {
            dojoId,
            actorUserId: request.user.sub,
            action: 'STUDENT_CREATED',
            entityType: 'Student',
            entityId: created.id,
            afterJson: studentSnapshot(created),
            metadata: { classId: parsed.data.classId ?? null }
          }
        });
        return created;
      });
      return reply.code(201).send({ student });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send({ error: 'STUDENT_CODE_EXISTS' });
      throw error;
    }
  });

  app.patch('/:studentId', { preHandler: [requirePermission('canEditStudentInfo')] }, async (request, reply) => {
    const { studentId } = request.params as { studentId: string };
    const parsed = updateStudentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const { expectedUpdatedAt, ...input } = parsed.data;
    if (!Object.keys(input).length) return reply.code(400).send({ error: 'NO_CHANGES' });

    const existing = await prisma.student.findUnique({ where: { id: studentId } });
    if (!existing) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!canAccess(request, existing.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });

    const code = input.code === undefined ? undefined : input.code.trim();
    const name = input.name === undefined ? undefined : input.name.trim();
    if (code !== undefined && !code) return reply.code(400).send({ error: 'INVALID_CODE' });
    if (name !== undefined && !name) return reply.code(400).send({ error: 'INVALID_NAME' });

    const dobResult = parseDob(input.dob);
    if (dobResult.error) return reply.code(400).send({ error: dobResult.error });

    if (code && code !== existing.code) {
      const duplicate = await prisma.student.findFirst({ where: { dojoId: existing.dojoId, code, NOT: { id: studentId } } });
      if (duplicate) return reply.code(409).send({ error: 'STUDENT_CODE_EXISTS' });
    }

    const data = {
      ...(code !== undefined ? { code } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.belt !== undefined ? { belt: normalizeOptionalText(input.belt) } : {}),
      ...(input.dob !== undefined ? { dob: dobResult.value } : {}),
      ...(input.parentPhone !== undefined ? { parentPhone: normalizeOptionalText(input.parentPhone) } : {}),
      ...(input.contactName !== undefined ? { contactName: normalizeOptionalText(input.contactName) } : {}),
      ...(input.address !== undefined ? { address: normalizeOptionalText(input.address) } : {}),
      ...(input.notes !== undefined ? { notes: normalizeOptionalText(input.notes) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    };

    try {
      const student = await prisma.$transaction(async tx => {
        const updated = await tx.student.updateMany({
          where: {
            id: studentId,
            ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {})
          },
          data
        });
        if (updated.count !== 1) throw new Error('STUDENT_CONFLICT');
        const value = await tx.student.findUniqueOrThrow({ where: { id: studentId } });
        await tx.auditLog.create({
          data: {
            dojoId: existing.dojoId,
            actorUserId: request.user.sub,
            action: 'STUDENT_UPDATED',
            entityType: 'Student',
            entityId: studentId,
            beforeJson: studentSnapshot(existing),
            afterJson: studentSnapshot(value),
            metadata: { fields: Object.keys(input) }
          }
        });
        return value;
      });
      return { student };
    } catch (error) {
      if (error instanceof Error && error.message === 'STUDENT_CONFLICT') return reply.code(409).send({ error: 'STUDENT_CONFLICT' });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send({ error: 'STUDENT_CODE_EXISTS' });
      throw error;
    }
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
