import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const invoiceSchema = z.object({
  studentId: z.string().min(1),
  monthKey: z.string().min(1).max(20),
  amountDue: z.coerce.number().positive(),
  note: z.string().max(1000).optional()
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().max(50).optional(),
  note: z.string().max(1000).optional()
});

export async function tuitionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/invoices', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN', 'TEACHER')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string; monthKey?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { invoices: [] };

    const invoices = await prisma.tuitionInvoice.findMany({
      where: { dojoId, ...(query.monthKey ? { monthKey: query.monthKey } : {}) },
      include: { student: true, payments: { orderBy: { paidAt: 'asc' } } },
      orderBy: [{ monthKey: 'desc' }, { student: { name: 'asc' } }]
    });
    return { invoices };
  });

  app.post('/invoices', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const parsed = invoiceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId } });
    if (!student) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && student.dojoId !== request.user.dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });

    const invoice = await prisma.tuitionInvoice.upsert({
      where: { dojoId_studentId_monthKey: { dojoId: student.dojoId, studentId: student.id, monthKey: parsed.data.monthKey } },
      update: { amountDue: parsed.data.amountDue, note: parsed.data.note },
      create: { dojoId: student.dojoId, studentId: student.id, monthKey: parsed.data.monthKey, amountDue: parsed.data.amountDue, note: parsed.data.note }
    });
    return reply.code(201).send({ invoice });
  });

  app.post('/invoices/:invoiceId/payments', { preHandler: [requireRole('SUPER_ADMIN', 'DOJO_ADMIN')] }, async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    const parsed = paymentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const invoice = await prisma.tuitionInvoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!invoice) return reply.code(404).send({ error: 'INVOICE_NOT_FOUND' });
    if (request.user.role !== 'SUPER_ADMIN' && invoice.dojoId !== request.user.dojoId) return reply.code(403).send({ error: 'FORBIDDEN' });

    const result = await prisma.$transaction(async tx => {
      const payment = await tx.tuitionPayment.create({
        data: { invoiceId, amount: parsed.data.amount, method: parsed.data.method, note: parsed.data.note, createdBy: request.user.sub }
      });
      const total = invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0) + parsed.data.amount;
      const amountDue = Number(invoice.amountDue);
      const status = total >= amountDue ? 'PAID' : total > 0 ? 'PARTIAL' : 'UNPAID';
      const updatedInvoice = await tx.tuitionInvoice.update({ where: { id: invoiceId }, data: { status } });
      await tx.auditLog.create({
        data: {
          dojoId: invoice.dojoId,
          actorUserId: request.user.sub,
          action: 'TUITION_PAYMENT_CREATED',
          entityType: 'TuitionPayment',
          entityId: payment.id,
          metadata: { invoiceId, amount: parsed.data.amount, status }
        }
      });
      return { payment, invoice: updatedInvoice };
    });

    return reply.code(201).send(result);
  });
}
