import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const classSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  activeDays: z.array(z.number().int().min(1).max(7)).default([]),
  startTime: z.string().max(20).optional(),
  endTime: z.string().max(20).optional(),
  venue: z.string().max(300).optional(),
  instructorName: z.string().max(200).optional()
});

export async function classRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/', async request => {
    const query = (request.query ?? {}) as { dojoId?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { classes: [] };

    const classes = await prisma.dojoClass.findMany({
      where: { dojoId },
      orderBy: { name: 'asc' }
    });
    return { classes };
  });

  app.post('/', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const parsed = classSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const body = request.body as z.infer<typeof classSchema> & { dojoId?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? body.dojoId : request.user.dojoId;
    if (!dojoId) return reply.code(400).send({ error: 'DOJO_REQUIRED' });

    const dojoClass = await prisma.dojoClass.create({
      data: { dojoId, ...parsed.data }
    });

    await prisma.auditLog.create({
      data: {
        dojoId,
        actorUserId: request.user.sub,
        action: 'CLASS_CREATED',
        entityType: 'DojoClass',
        entityId: dojoClass.id,
        metadata: { code: dojoClass.code, name: dojoClass.name }
      }
    });

    return reply.code(201).send({ class: dojoClass });
  });
}
