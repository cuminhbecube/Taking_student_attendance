import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

process.env.NODE_ENV = 'test';
const app = await buildApp();

async function call(method: string, url: string, token?: string, payload?: unknown) {
  return app.inject({ method: method as any, url, headers: token ? { authorization: `Bearer ${token}` } : undefined, payload });
}
async function login(username: string, password: string, status = 200) {
  const res = await call('POST', '/api/auth/login', undefined, { username, password });
  assert.equal(res.statusCode, status, `${username}: ${res.body}`);
  return res.json() as any;
}

try {
  assert.equal((await call('GET', '/api/health')).statusCode, 200);
  assert.equal((await login('admin', 'wrong', 401)).error, 'INVALID_CREDENTIALS');

  const admin = await login('admin', 'admin123');
  const hnk = await login('hanoikid', '123456');
  const teacher = await login('gv_lan', '123456');
  const coach = await login('hlv_tuan', '123456');
  const cg = await login('dojo_cg', 'dojo123');
  assert.equal(admin.user.role, 'SUPER_ADMIN');
  assert.equal(hnk.user.role, 'DOJO_ADMIN');
  assert.equal(teacher.user.role, 'TEACHER');
  assert.equal(coach.user.role, 'COACH');
  assert.notEqual(hnk.user.dojoId, cg.user.dojoId);
  assert.equal((await call('GET', '/api/auth/me', teacher.token)).statusCode, 200);

  const dojos = await call('GET', '/api/admin/dojos', admin.token);
  assert.equal(dojos.statusCode, 200);
  assert.ok((dojos.json() as any).dojos.length >= 2);
  assert.equal((await call('GET', '/api/admin/dojos', hnk.token)).statusCode, 403);

  const hnkClass = ((await call('GET', '/api/classes', hnk.token)).json() as any).classes[0];
  const cgClass = ((await call('GET', '/api/classes', cg.token)).json() as any).classes[0];
  assert.ok(hnkClass && cgClass);
  assert.notEqual(hnkClass.dojoId, cgClass.dojoId);
  assert.equal((await call('GET', `/api/classes/${cgClass.id}`, hnk.token)).statusCode, 403);
  assert.equal((await call('POST', '/api/classes', coach.token, { code: 'NO', name: 'Denied', activeDays: [2] })).statusCode, 403);

  const secondClassRes = await call('POST', '/api/classes', hnk.token, { code: `MU${Date.now()}`, name: 'Lớp học bù E2E', activeDays: [4] });
  assert.equal(secondClassRes.statusCode, 201, secondClassRes.body);
  const secondClass = (secondClassRes.json() as any).class;

  const studentsRes = await call('GET', '/api/students', hnk.token);
  assert.equal(studentsRes.statusCode, 200);
  const student = (studentsRes.json() as any).students.find((s: any) => s.code === 'HNK001');
  assert.ok(student);

  const createdRes = await call('POST', '/api/students', teacher.token, { code: `T${Date.now()}`, name: 'Student E2E', belt: 'Trắng', classId: hnkClass.id });
  assert.equal(createdRes.statusCode, 201, createdRes.body);
  const created = (createdRes.json() as any).student;
  assert.equal((await call('PATCH', `/api/students/${created.id}`, teacher.token, { belt: 'Vàng' })).statusCode, 200);
  assert.equal((await call('DELETE', `/api/students/${created.id}`, teacher.token)).statusCode, 403);
  assert.equal((await call('POST', '/api/students', coach.token, { code: `C${Date.now()}`, name: 'Denied' })).statusCode, 403);
  assert.equal((await call('POST', `/api/students/${student.id}/enrollments`, teacher.token, { classId: secondClass.id, isPrimary: false })).statusCode, 201);

  const sessionRes = await call('POST', '/api/attendance/sessions', teacher.token, { classId: hnkClass.id, sessionDate: new Date(Date.now() + 3_000_000).toISOString(), title: 'E2E' });
  assert.equal(sessionRes.statusCode, 201, sessionRes.body);
  const session = (sessionRes.json() as any).session;
  assert.equal((await call('POST', '/api/attendance/sessions', teacher.token, { classId: cgClass.id, sessionDate: new Date(Date.now() + 4_000_000).toISOString() })).statusCode, 403);

  let r = await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: student.id, status: 'LATE', type: 'NORMAL', registeredClassId: hnkClass.id, lateMinutes: 7 });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal((r.json() as any).record.lateMinutes, 7);
  r = await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: student.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: secondClass.id });
  assert.equal((r.json() as any).error, 'NORMAL_CLASS_MISMATCH');
  r = await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: student.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: hnkClass.id });
  assert.equal((r.json() as any).error, 'MAKEUP_REQUIRES_ORIGIN_CLASS');
  r = await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: student.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: secondClass.id });
  assert.equal(r.statusCode, 200, r.body);
  r = await call('PUT', `/api/attendance/sessions/${session.id}/records/bulk`, coach.token, { records: [{ studentId: student.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id }] });
  assert.equal(r.statusCode, 200, r.body);

  let foreign = await prisma.student.findFirst({ where: { dojoId: cg.user.dojoId } });
  if (!foreign) foreign = await prisma.student.create({ data: { dojoId: cg.user.dojoId, code: `CG${Date.now()}`, name: 'Foreign' } });
  r = await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: foreign.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: cgClass.id });
  assert.equal((r.json() as any).error, 'TENANT_MISMATCH');

  assert.equal((await call('POST', `/api/attendance/sessions/${session.id}/finalize`, teacher.token)).statusCode, 200);
  assert.equal((await call('POST', `/api/attendance/sessions/${session.id}/finalize`, teacher.token)).statusCode, 200);
  assert.equal((await call('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: student.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id })).statusCode, 409);
  assert.equal((await call('DELETE', `/api/classes/${hnkClass.id}`, hnk.token)).statusCode, 409);

  assert.equal((await call('GET', '/api/tuition/invoices', teacher.token)).statusCode, 403);
  const perm = { dojoId: hnk.user.dojoId, canViewTuition: true, canEditTuition: true, canEditSchedule: true, canTakeAttendance: true, canAddStudent: true, canEditStudentInfo: true, canDeleteStudent: false, canAddDateSession: true, canExportData: true };
  assert.equal((await call('PUT', '/api/admin/permissions/TEACHER', hnk.token, perm)).statusCode, 200);
  assert.equal((await call('GET', '/api/tuition/invoices', teacher.token)).statusCode, 200);

  const month = `E2E-${Date.now()}`;
  const invoiceRes = await call('POST', '/api/tuition/invoices', teacher.token, { studentId: student.id, monthKey: month, amountDue: 500000 });
  assert.equal(invoiceRes.statusCode, 201, invoiceRes.body);
  const invoice = (invoiceRes.json() as any).invoice;
  r = await call('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 200000 });
  assert.equal((r.json() as any).invoice.status, 'PARTIAL');
  r = await call('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 400000 });
  assert.equal((r.json() as any).error, 'OVERPAYMENT');
  r = await call('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 300000 });
  assert.equal((r.json() as any).invoice.status, 'PAID');
  assert.equal(((await call('GET', `/api/tuition/summary?monthKey=${encodeURIComponent(month)}`, teacher.token)).json() as any).summary.paid, 1);
  assert.equal((await call('POST', '/api/tuition/invoices', teacher.token, { studentId: foreign.id, monthKey: `DENY-${Date.now()}`, amountDue: 1 })).statusCode, 403);

  const username = `staff_${Date.now()}`;
  const staffRes = await call('POST', '/api/admin/users', hnk.token, { username, password: 'strong123', fullName: 'Staff E2E', role: 'COACH', dojoId: hnk.user.dojoId });
  assert.equal(staffRes.statusCode, 201, staffRes.body);
  const staff = (staffRes.json() as any).user;
  assert.equal((await call('POST', '/api/admin/users', hnk.token, { username: `bad_${Date.now()}`, password: 'strong123', fullName: 'Bad', role: 'COACH', dojoId: cg.user.dojoId })).statusCode, 403);
  assert.equal((await call('PATCH', `/api/admin/users/${staff.id}`, hnk.token, { status: 'LOCKED' })).statusCode, 200);
  assert.equal((await login(username, 'strong123', 403)).error, 'ACCOUNT_LOCKED');
  assert.equal((await call('PATCH', `/api/admin/users/${staff.id}`, hnk.token, { status: 'ACTIVE' })).statusCode, 200);
  let staffLogin = await login(username, 'strong123');
  assert.equal((await call('POST', `/api/admin/users/${staff.id}/password`, hnk.token, { password: 'changed123' })).statusCode, 200);
  assert.equal((await login(username, 'strong123', 401)).error, 'INVALID_CREDENTIALS');
  staffLogin = await login(username, 'changed123');
  assert.equal((await call('POST', '/api/auth/change-password', staffLogin.token, { currentPassword: 'bad', newPassword: 'another123' })).statusCode, 400);
  assert.equal((await call('POST', '/api/auth/change-password', staffLogin.token, { currentPassword: 'changed123', newPassword: 'changed123' })).statusCode, 400);
  assert.equal((await call('POST', '/api/auth/change-password', staffLogin.token, { currentPassword: 'changed123', newPassword: 'another123' })).statusCode, 200);
  assert.equal((await login(username, 'another123')).user.id, staff.id);

  assert.equal((await call('PATCH', `/api/admin/dojos/${cg.user.dojoId}`, admin.token, { status: 'LOCKED' })).statusCode, 200);
  assert.equal((await login('dojo_cg', 'dojo123', 403)).error, 'DOJO_LOCKED');
  assert.equal((await call('PATCH', `/api/admin/dojos/${cg.user.dojoId}`, admin.token, { status: 'ACTIVE' })).statusCode, 200);
  assert.equal((await login('dojo_cg', 'dojo123')).user.role, 'DOJO_ADMIN');

  const audit = await call('GET', '/api/admin/audit?limit=500', hnk.token);
  assert.equal(audit.statusCode, 200);
  assert.ok((audit.json() as any).auditLogs.length >= 10);
  console.log('E2E PASS: 50+ assertions across auth, RBAC, permissions, tenants, CRUD, enrollment, attendance, tuition, locks and audit');
} finally {
  await app.close();
  await prisma.$disconnect();
}
