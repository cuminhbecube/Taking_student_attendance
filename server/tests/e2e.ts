import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

process.env.NODE_ENV = 'test';

const app = await buildApp();

async function login(username: string, password: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  assert.equal(res.statusCode, 200, `login ${username}: ${res.body}`);
  const body = res.json() as { token: string; user: { id: string; dojoId: string | null; role: string } };
  assert.ok(body.token);
  return body;
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

try {
  const health = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(health.statusCode, 200);

  const invalidLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'admin', password: 'wrong' } });
  assert.equal(invalidLogin.statusCode, 401);

  const admin = await login('admin', 'admin123');
  const dojoAdmin = await login('hanoikid', '123456');
  const teacher = await login('gv_lan', '123456');
  const coach = await login('hlv_tuan', '123456');
  const otherDojoAdmin = await login('dojo_cg', 'dojo123');

  assert.equal(admin.user.role, 'SUPER_ADMIN');
  assert.equal(dojoAdmin.user.role, 'DOJO_ADMIN');
  assert.equal(teacher.user.role, 'TEACHER');
  assert.equal(coach.user.role, 'COACH');
  assert.notEqual(dojoAdmin.user.dojoId, otherDojoAdmin.user.dojoId);

  const hnkClasses = await app.inject({ method: 'GET', url: '/api/classes', headers: auth(dojoAdmin.token) });
  assert.equal(hnkClasses.statusCode, 200);
  const hnkClass = (hnkClasses.json() as any).classes[0];
  assert.ok(hnkClass);

  const cgClasses = await app.inject({ method: 'GET', url: '/api/classes', headers: auth(otherDojoAdmin.token) });
  assert.equal(cgClasses.statusCode, 200);
  const cgClass = (cgClasses.json() as any).classes[0];
  assert.ok(cgClass);
  assert.notEqual(hnkClass.dojoId, cgClass.dojoId);

  const coachCreateClass = await app.inject({
    method: 'POST', url: '/api/classes', headers: auth(coach.token),
    payload: { code: 'DENIED', name: 'Không được tạo', activeDays: [2] }
  });
  assert.equal(coachCreateClass.statusCode, 403);

  const students = await app.inject({ method: 'GET', url: '/api/students', headers: auth(dojoAdmin.token) });
  assert.equal(students.statusCode, 200);
  const seededStudent = (students.json() as any).students.find((s: any) => s.code === 'HNK001');
  assert.ok(seededStudent);

  const teacherStudentCode = `T${Date.now()}`;
  const teacherCreateStudent = await app.inject({
    method: 'POST', url: '/api/students', headers: auth(teacher.token),
    payload: { code: teacherStudentCode, name: 'Võ sinh Teacher tạo', belt: 'Trắng' }
  });
  assert.equal(teacherCreateStudent.statusCode, 201, teacherCreateStudent.body);
  const teacherStudent = (teacherCreateStudent.json() as any).student;
  assert.equal(teacherStudent.dojoId, dojoAdmin.user.dojoId);

  const coachCreateStudent = await app.inject({
    method: 'POST', url: '/api/students', headers: auth(coach.token),
    payload: { code: `C${Date.now()}`, name: 'Không được tạo' }
  });
  assert.equal(coachCreateStudent.statusCode, 403);

  const sessionDate = new Date(Date.now() + Math.floor(Math.random() * 1000000)).toISOString();
  const createSession = await app.inject({
    method: 'POST', url: '/api/attendance/sessions', headers: auth(teacher.token),
    payload: { classId: hnkClass.id, sessionDate, title: 'E2E session' }
  });
  assert.equal(createSession.statusCode, 201, createSession.body);
  const session = (createSession.json() as any).session;

  const crossTenantSession = await app.inject({
    method: 'POST', url: '/api/attendance/sessions', headers: auth(teacher.token),
    payload: { classId: cgClass.id, sessionDate: new Date(Date.now() + 2000000).toISOString() }
  });
  assert.equal(crossTenantSession.statusCode, 403);

  const markPresent = await app.inject({
    method: 'PUT', url: `/api/attendance/sessions/${session.id}/records`, headers: auth(coach.token),
    payload: { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id }
  });
  assert.equal(markPresent.statusCode, 200, markPresent.body);

  const markLate = await app.inject({
    method: 'PUT', url: `/api/attendance/sessions/${session.id}/records`, headers: auth(coach.token),
    payload: { studentId: seededStudent.id, status: 'LATE', type: 'NORMAL', registeredClassId: hnkClass.id, lateMinutes: 7 }
  });
  assert.equal(markLate.statusCode, 200, markLate.body);
  assert.equal((markLate.json() as any).record.lateMinutes, 7);

  const cgStudents = await prisma.student.findMany({ where: { dojoId: otherDojoAdmin.user.dojoId! } });
  let foreignStudent = cgStudents[0];
  if (!foreignStudent) foreignStudent = await prisma.student.create({ data: { dojoId: otherDojoAdmin.user.dojoId!, code: `CG${Date.now()}`, name: 'Foreign Student' } });

  const crossTenantMark = await app.inject({
    method: 'PUT', url: `/api/attendance/sessions/${session.id}/records`, headers: auth(coach.token),
    payload: { studentId: foreignStudent.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: cgClass.id }
  });
  assert.equal(crossTenantMark.statusCode, 400);
  assert.equal((crossTenantMark.json() as any).error, 'TENANT_MISMATCH');

  const finalize = await app.inject({ method: 'POST', url: `/api/attendance/sessions/${session.id}/finalize`, headers: auth(teacher.token) });
  assert.equal(finalize.statusCode, 200);

  const markAfterFinalize = await app.inject({
    method: 'PUT', url: `/api/attendance/sessions/${session.id}/records`, headers: auth(coach.token),
    payload: { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id }
  });
  assert.equal(markAfterFinalize.statusCode, 409);
  assert.equal((markAfterFinalize.json() as any).error, 'SESSION_FINALIZED');

  const teacherInvoice = await app.inject({
    method: 'POST', url: '/api/tuition/invoices', headers: auth(teacher.token),
    payload: { studentId: seededStudent.id, monthKey: '2099-01', amountDue: 500000 }
  });
  assert.equal(teacherInvoice.statusCode, 403);

  const invoiceRes = await app.inject({
    method: 'POST', url: '/api/tuition/invoices', headers: auth(dojoAdmin.token),
    payload: { studentId: seededStudent.id, monthKey: `E2E-${Date.now()}`, amountDue: 500000 }
  });
  assert.equal(invoiceRes.statusCode, 201, invoiceRes.body);
  const invoice = (invoiceRes.json() as any).invoice;

  const payment1 = await app.inject({
    method: 'POST', url: `/api/tuition/invoices/${invoice.id}/payments`, headers: auth(dojoAdmin.token),
    payload: { amount: 200000, method: 'CASH' }
  });
  assert.equal(payment1.statusCode, 201);
  assert.equal((payment1.json() as any).invoice.status, 'PARTIAL');

  const payment2 = await app.inject({
    method: 'POST', url: `/api/tuition/invoices/${invoice.id}/payments`, headers: auth(dojoAdmin.token),
    payload: { amount: 300000, method: 'TRANSFER' }
  });
  assert.equal(payment2.statusCode, 201);
  assert.equal((payment2.json() as any).invoice.status, 'PAID');

  const foreignInvoiceAttempt = await app.inject({
    method: 'POST', url: '/api/tuition/invoices', headers: auth(dojoAdmin.token),
    payload: { studentId: foreignStudent.id, monthKey: `DENY-${Date.now()}`, amountDue: 1 }
  });
  assert.equal(foreignInvoiceAttempt.statusCode, 403);

  const auditCount = await prisma.auditLog.count({ where: { dojoId: dojoAdmin.user.dojoId! } });
  assert.ok(auditCount >= 4);

  console.log('E2E PASS: auth, RBAC, tenant isolation, students, attendance, finalize, tuition, audit');
} finally {
  await app.close();
  await prisma.$disconnect();
}
