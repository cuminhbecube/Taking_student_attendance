import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const createStudentSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  belt: z.string().max(100).optional(),
  dob: z.string().optional(),
  parentPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional()
});

export async function studentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async request => {
    const query = (request.query ?? {}) as { q?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN'
      ? ((request.query as { dojoId?: string } | undefined)?.dojoId ?? null)
      : request.user.dojoId;

    if (!dojoId) return { students: [] };

    const students = await prisma.student.findMany({
      where: {
        dojoId,
        isActive: true,
        ...(query.q ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { code: { contains: query.q, mode: 'insensitive' } },
            { parentPhone: { contains: query.q } }
          ]
        } : {})
      },
      include: {
        enrollments: {
          where: { endedAt: null },
          include: { class: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return { students };
  });

  app.post('/', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER')] }, async (request, reply) => {
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const body = request.body as z.infer<typeof createStudentSchema> & { dojoId?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? body.dojoId : request.user.dojoId;
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });

    const student = await prisma.student.create({
      data: {
        dojoId,
        code: parsed.data.code.trim(),
        name: parsed.data.name.trim(),
        belt: parsed.data.belt,
        dob: parsed.data.dob ? new Date(parsed.data.dob) : undefined,
        parentPhone: parsed.data.parentPhone,
        notes: parsed.data.notes
      }
    });

    await prisma.auditLog.create({
      data: {
        dojoId,
        actorUserId: request.user.sub,
        action: 'STUDENT_CREATED',
        entityType: 'Student',
        entityId: student.id,
        afterJson: student
      }
    });

    return reply.code(201).send({ student });
  });
}
