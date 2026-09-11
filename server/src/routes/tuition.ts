import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const invoiceSchema = z.object({
  studentId: z.string().min(1),
  monthKey: z.string().min(1).max(20),
  amountDue: z.coerce.number().positive().max(1_000_000_000),
  note: z.string().max(1000).optional()
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  method: z.string().max(50).optional(),
  note: z.string().max(1000).optional()
});

function canAccess(request: any, dojoId: string) {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}

export async function tuitionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/invoices', { preHandler: [requirePermission('canViewTuition')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string; monthKey?: string; status?: 'UNPAID' | 'PARTIAL' | 'PAID' };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { invoices: [] };
    const invoices = await prisma.tuitionInvoice.findMany({
      where: { dojoId, ...(query.monthKey ? { monthKey: query.monthKey } : {}), ...(query.status ? { status: query.status } : {}) },
      include: { student: true, payments: { orderBy: { paidAt: 'asc' } } },
      orderBy: [{ monthKey: 'desc' }, { student: { name: 'asc' } }]
    });
    return {
      invoices: invoices.map(invoice => ({
        ...invoice,
        amountDue: Number(invoice.amountDue),
        totalPaid: invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        payments: invoice.payments.map(p => ({ ...p, amount: Number(p.amount) }))
      }))
    };
  });

  app.get('/summary', { preHandler: [requirePermission('canViewTuition')] }, async request => {
    const query = (request.query ?? {}) as { dojoId?: string; monthKey?: string };
    const dojoId = request.user.role === 'SUPER_ADMIN' ? query.dojoId ?? null : request.user.dojoId;
    if (!dojoId) return { summary: { count: 0, amountDue: 0, amountPaid: 0, unpaid: 0, partial: 0, paid: 0 } };
    const invoices = await prisma.tuitionInvoice.findMany({ where: { dojoId, ...(query.monthKey ? { monthKey: query.monthKey } : {}) }, include: { payments: true } });
    const summary = invoices.reduce((acc, invoice) => {
      acc.count += 1;
      acc.amountDue += Number(invoice.amountDue);
      acc.amountPaid += invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (invoice.status === 'PAID') acc.paid += 1;
      else if (invoice.status === 'PARTIAL') acc.partial += 1;
      else acc.unpaid += 1;
      return acc;
    }, { count: 0, amountDue: 0, amountPaid: 0, unpaid: 0, partial: 0, paid: 0 });
    return { summary };
  });

  app.post('/invoices', { preHandler: [requirePermission('canEditTuition')] }, async (request, reply) => {
    const parsed = invoiceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    const student = await prisma.student.findUnique({ where: { id: parsed.data.studentId } });
    if (!student) return reply.code(404).send({ error: 'STUDENT_NOT_FOUND' });
    if (!canAccess(request, student.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });

    const existing = await prisma.tuitionInvoice.findUnique({ where: { dojoId_studentId_monthKey: { dojoId: student.dojoId, studentId: student.id, monthKey: parsed.data.monthKey } }, include: { payments: true } });
    const paid = existing?.payments.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    if (paid > parsed.data.amountDue) {
      return reply.code(400).send({ error: 'AMOUNT_BELOW_PAID', message: 'Không thể giảm học phí phải thu xuống thấp hơn số tiền đã thu.', totalPaid: paid });
    }
    const status = paid >= parsed.data.amountDue ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
    const invoice = await prisma.$transaction(async tx => {
      const value = await tx.tuitionInvoice.upsert({
        where: { dojoId_studentId_monthKey: { dojoId: student.dojoId, studentId: student.id, monthKey: parsed.data.monthKey } },
        update: { amountDue: parsed.data.amountDue, note: parsed.data.note, status },
        create: { dojoId: student.dojoId, studentId: student.id, monthKey: parsed.data.monthKey, amountDue: parsed.data.amountDue, note: parsed.data.note, status }
      });
      await tx.auditLog.create({ data: { dojoId: student.dojoId, actorUserId: request.user.sub, action: existing ? 'TUITION_INVOICE_UPDATED' : 'TUITION_INVOICE_CREATED', entityType: 'TuitionInvoice', entityId: value.id, metadata: { studentId: student.id, monthKey: parsed.data.monthKey, amountDue: parsed.data.amountDue, status } } });
      return value;
    });
    return reply.code(existing ? 200 : 201).send({ invoice: { ...invoice, amountDue: Number(invoice.amountDue) } });
  });

  app.post('/invoices/:invoiceId/payments', { preHandler: [requirePermission('canEditTuition')] }, async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    const parsed = paymentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

    const initial = await prisma.tuitionInvoice.findUnique({ where: { id: invoiceId } });
    if (!initial) return reply.code(404).send({ error: 'INVOICE_NOT_FOUND' });
    if (!canAccess(request, initial.dojoId)) return reply.code(403).send({ error: 'FORBIDDEN' });

    try {
      const result = await prisma.$transaction(async tx => {
        const invoice = await tx.tuitionInvoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
        if (!invoice) throw new Error('INVOICE_DISAPPEARED');
        const currentPaid = invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0);
        const amountDue = Number(invoice.amountDue);
        if (currentPaid + parsed.data.amount > amountDue) {
          return { kind: 'OVERPAYMENT' as const, remaining: Math.max(amountDue - currentPaid, 0) };
        }

        const payment = await tx.tuitionPayment.create({ data: { invoiceId, amount: parsed.data.amount, method: parsed.data.method, note: parsed.data.note, createdBy: request.user.sub } });
        const total = currentPaid + parsed.data.amount;
        const status = total >= amountDue ? 'PAID' : total > 0 ? 'PARTIAL' : 'UNPAID';
        const updatedInvoice = await tx.tuitionInvoice.update({ where: { id: invoiceId }, data: { status } });
        await tx.auditLog.create({ data: { dojoId: invoice.dojoId, actorUserId: request.user.sub, action: 'TUITION_PAYMENT_CREATED', entityType: 'TuitionPayment', entityId: payment.id, metadata: { invoiceId, amount: parsed.data.amount, totalPaid: total, status } } });
        return { kind: 'OK' as const, payment: { ...payment, amount: Number(payment.amount) }, invoice: { ...updatedInvoice, amountDue: Number(updatedInvoice.amountDue), totalPaid: total } };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (result.kind === 'OVERPAYMENT') {
        return reply.code(400).send({ error: 'OVERPAYMENT', message: 'Số tiền thu vượt quá số học phí còn thiếu.', remaining: result.remaining });
      }
      return reply.code(201).send({ payment: result.payment, invoice: result.invoice });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        return reply.code(409).send({ error: 'PAYMENT_CONFLICT', message: 'Học phí vừa được cập nhật từ thiết bị khác. Vui lòng tải lại và thử lại.' });
      }
      throw error;
    }
  });
}
