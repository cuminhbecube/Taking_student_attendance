import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

process.env.NODE_ENV = 'test';
const app = await buildApp();

async function login(username: string, password: string, expected = 200) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  assert.equal(res.statusCode, expected, `login ${username}: ${res.body}`);
  return res.statusCode === 200 ? res.json() as any : res.json() as any;
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
const req = (method: string, url: string, token?: string, payload?: unknown) => app.inject({ method: method as any, url, headers: token ? auth(token) : undefined, payload });

try {
  assert.equal((await req('GET', '/api/health')).statusCode, 200);
  assert.equal((await login('admin', 'wrong', 401)).error, 'INVALID_CREDENTIALS');

  const admin = await login('admin', 'admin123');
  const dojoAdmin = await login('hanoikid', '123456');
  const teacher = await login('gv_lan', '123456');
  const coach = await login('hlv_tuan', '123456');
  const cgAdmin = await login('dojo_cg', 'dojo123');
  assert.equal(admin.user.role, 'SUPER_ADMIN');
  assert.equal(dojoAdmin.user.role, 'DOJO_ADMIN');
  assert.equal(teacher.user.role, 'TEACHER');
  assert.equal(coach.user.role, 'COACH');
  assert.notEqual(dojoAdmin.user.dojoId, cgAdmin.user.dojoId);

  // Auth/me and tenant discovery.
  assert.equal((await req('GET', '/api/auth/me', teacher.token)).statusCode, 200);
  const dojosRes = await req('GET', '/api/admin/dojos', admin.token);
  assert.equal(dojosRes.statusCode, 200);
  assert.ok((dojosRes.json() as any).dojos.length >= 2);
  assert.equal((await req('GET', '/api/admin/dojos', dojoAdmin.token)).statusCode, 403);

  const hnkClassesRes = await req('GET', '/api/classes', dojoAdmin.token);
  const cgClassesRes = await req('GET', '/api/classes', cgAdmin.token);
  assert.equal(hnkClassesRes.statusCode, 200);
  assert.equal(cgClassesRes.statusCode, 200);
  const hnkClass = (hnkClassesRes.json() as any).classes[0];
  const cgClass = (cgClassesRes.json() as any).classes[0];
  assert.ok(hnkClass && cgClass);
  assert.notEqual(hnkClass.dojoId, cgClass.dojoId);

  // Cross-tenant class detail must be blocked.
  assert.equal((await req('GET', `/api/classes/${cgClass.id}`, dojoAdmin.token)).statusCode, 403);
  assert.equal((await req('POST', '/api/classes', coach.token, { code: 'DENIED', name: 'Denied', activeDays: [2] })).statusCode, 403);

  // Create a second HNK class for makeup testing.
  const secondClassRes = await req('POST', '/api/classes', dojoAdmin.token, { code: `MU${Date.now()}`, name: 'Lớp học bù E2E', activeDays: [4] });
  assert.equal(secondClassRes.statusCode, 201, secondClassRes.body);
  const secondClass = (secondClassRes.json() as any).class;

  // Student CRUD permissions.
  const studentsRes = await req('GET', '/api/students', dojoAdmin.token);
  assert.equal(studentsRes.statusCode, 200);
  const seededStudent = (studentsRes.json() as any).students.find((s: any) => s.code === 'HNK001');
  assert.ok(seededStudent);

  const teacherCreatedRes = await req('POST', '/api/students', teacher.token, { code: `T${Date.now()}`, name: 'Võ sinh Teacher tạo', belt: 'Trắng', classId: hnkClass.id });
  assert.equal(teacherCreatedRes.statusCode, 201, teacherCreatedRes.body);
  const teacherStudent = (teacherCreatedRes.json() as any).student;
  assert.equal(teacherStudent.dojoId, dojoAdmin.user.dojoId);
  assert.equal((await req('POST', '/api/students', coach.token, { code: `C${Date.now()}`, name: 'Denied' })).statusCode, 403);
  assert.equal((await req('PATCH', `/api/students/${teacherStudent.id}`, teacher.token, { belt: 'Vàng' })).statusCode, 200);
  assert.equal((await req('DELETE', `/api/students/${teacherStudent.id}`, teacher.token)).statusCode, 403);

  // Enroll seeded student into second class, then keep original as registered class for makeup.
  const enrollmentRes = await req('POST', `/api/students/${seededStudent.id}/enrollments`, teacher.token, { classId: secondClass.id, isPrimary: false });
  assert.equal(enrollmentRes.statusCode, 201, enrollmentRes.body);

  // Attendance session + normal flow.
  const sessionDate = new Date(Date.now() + 3_000_000).toISOString();
  const sessionRes = await req('POST', '/api/attendance/sessions', teacher.token, { classId: hnkClass.id, sessionDate, title: 'E2E normal' });
  assert.equal(sessionRes.statusCode, 201, sessionRes.body);
  const session = (sessionRes.json() as any).session;
  assert.equal((await req('POST', '/api/attendance/sessions', teacher.token, { classId: cgClass.id, sessionDate: new Date(Date.now() + 4_000_000).toISOString() })).statusCode, 403);

  const markPresent = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id });
  assert.equal(markPresent.statusCode, 200, markPresent.body);
  const markLate = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'LATE', type: 'NORMAL', registeredClassId: hnkClass.id, lateMinutes: 7 });
  assert.equal(markLate.statusCode, 200, markLate.body);
  assert.equal((markLate.json() as any).record.lateMinutes, 7);

  // Business-rule failures.
  const wrongNormal = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: secondClass.id });
  assert.equal(wrongNormal.statusCode, 400);
  assert.equal((wrongNormal.json() as any).error, 'NORMAL_CLASS_MISMATCH');
  const wrongMakeup = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: hnkClass.id });
  assert.equal(wrongMakeup.statusCode, 400);
  assert.equal((wrongMakeup.json() as any).error, 'MAKEUP_REQUIRES_ORIGIN_CLASS');

  // Valid makeup: attend hnkClass while registeredClass is secondClass.
  const validMakeup = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: secondClass.id });
  assert.equal(validMakeup.statusCode, 200, validMakeup.body);

  // Bulk attendance.
  const bulkRes = await req('PUT', `/api/attendance/sessions/${session.id}/records/bulk`, coach.token, { records: [
    { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id }
  ] });
  assert.equal(bulkRes.statusCode, 200, bulkRes.body);
  assert.equal((bulkRes.json() as any).records.length, 1);

  // Cross tenant attendance must fail.
  let foreignStudent = await prisma.student.findFirst({ where: { dojoId: cgAdmin.user.dojoId } });
  if (!foreignStudent) foreignStudent = await prisma.student.create({ data: { dojoId: cgAdmin.user.dojoId, code: `CG${Date.now()}`, name: 'Foreign Student' } });
  const crossTenantMark = await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: foreignStudent.id, status: 'PRESENT', type: 'MAKEUP', registeredClassId: cgClass.id });
  assert.equal(crossTenantMark.statusCode, 400);
  assert.equal((crossTenantMark.json() as any).error, 'TENANT_MISMATCH');

  // Finalize prevents all later changes and class deletion with history.
  assert.equal((await req('POST', `/api/attendance/sessions/${session.id}/finalize`, teacher.token)).statusCode, 200);
  assert.equal((await req('POST', `/api/attendance/sessions/${session.id}/finalize`, teacher.token)).statusCode, 200);
  assert.equal((await req('PUT', `/api/attendance/sessions/${session.id}/records`, coach.token, { studentId: seededStudent.id, status: 'PRESENT', type: 'NORMAL', registeredClassId: hnkClass.id })).statusCode, 409);
  assert.equal((await req('DELETE', `/api/classes/${hnkClass.id}`, dojoAdmin.token)).statusCode, 409);

  // Tuition default permissions deny teacher.
  assert.equal((await req('GET', '/api/tuition/invoices', teacher.token)).statusCode, 403);
  assert.equal((await req('POST', '/api/tuition/invoices', teacher.token, { studentId: seededStudent.id, monthKey: '2099-01', amountDue: 500000 })).statusCode, 403);

  // Grant teacher tuition view/edit and verify permission becomes effective server-side.
  const permissionPayload = {
    dojoId: dojoAdmin.user.dojoId,
    canViewTuition: true, canEditTuition: true, canEditSchedule: true, canTakeAttendance: true,
    canAddStudent: true, canEditStudentInfo: true, canDeleteStudent: false, canAddDateSession: true, canExportData: true
  };
  assert.equal((await req('PUT', '/api/admin/permissions/TEACHER', dojoAdmin.token, permissionPayload)).statusCode, 200);
  assert.equal((await req('GET', '/api/tuition/invoices', teacher.token)).statusCode, 200);

  const monthKey = `E2E-${Date.now()}`;
  const invoiceRes = await req('POST', '/api/tuition/invoices', teacher.token, { studentId: seededStudent.id, monthKey, amountDue: 500000 });
  assert.equal(invoiceRes.statusCode, 201, invoiceRes.body);
  const invoice = (invoiceRes.json() as any).invoice;
  const p1 = await req('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 200000, method: 'CASH' });
  assert.equal(p1.statusCode, 201, p1.body);
  assert.equal((p1.json() as any).invoice.status, 'PARTIAL');
  const overpay = await req('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 400000 });
  assert.equal(overpay.statusCode, 400);
  assert.equal((overpay.json() as any).error, 'OVERPAYMENT');
  const p2 = await req('POST', `/api/tuition/invoices/${invoice.id}/payments`, teacher.token, { amount: 300000, method: 'TRANSFER' });
  assert.equal(p2.statusCode, 201);
  assert.equal((p2.json() as any).invoice.status, 'PAID');
  const summary = await req('GET', `/api/tuition/summary?monthKey=${encodeURIComponent(monthKey)}`, teacher.token);
  assert.equal(summary.statusCode, 200);
  assert.equal((summary.json() as any).summary.paid, 1);

  // Cross-tenant tuition remains blocked even after teacher permission granted.
  assert.equal((await req('POST', '/api/tuition/invoices', teacher.token, { studentId: foreignStudent.id, monthKey: `DENY-${Date.now()}`, amountDue: 1 })).statusCode, 403);

  // Admin user management and tenant isolation.
  const staffRes = await req('POST', '/api/admin/users', dojoAdmin.token, { username: `staff_${Date.now()}`, password: 'strong123', fullName: 'Staff E2E', role: 'COACH', dojoId: dojoAdmin.user.dojoId });
  assert.equal(staffRes.statusCode, 201, staffRes.body);
  const staff = (staffRes.json() as any).user;
  assert.equal((await req('POST', '/api/admin/users', dojoAdmin.token, { username: `bad_${Date.now()}`, password: 'strong123', fullName: 'Bad', role: 'COACH', dojoId: cgAdmin.user.dojoId })).statusCode, 403);
  assert.equal((await req('PATCH', `/api/admin/users/${staff.id}`, dojoAdmin.token, { status: 'LOCKED' })).statusCode, 200);
  assert.equal((await login(staff.username, 'strong123', 403)).error, 'ACCOUNT_LOCKED');
  assert.equal((await req('PATCH', `/api/admin/users/${staff.id}`, dojoAdmin.token, { status: 'ACTIVE' })).statusCode, 200);
  assert.equal((await login(staff.username, 'strong123')).user.role, 'COACH');
  assert.equal((await req('POST', `/api/admin/users/${staff.id}/password`, dojoAdmin.token, { password: 'changed123' })).statusCode, 200);
  assert.equal((await login(staff.username, 'strong123', 401)).error, 'INVALID_CREDENTIALS');
  assert.equal((await login(staff.username, 'changed123')).user.id, staff.id);

  // Self change password validates old password and prevents reuse.
  assert.equal((await req('POST', '/api/auth/change-password', staff.token, { currentPassword: 'bad', newPassword: 'another123' })).statusCode, 400);
  const refreshedStaff = await login(staff.username, 'changed123');
  assert.equal((await req('POST', '/api/auth/change-password', refreshedStaff.token, { currentPassword: 'changed123', newPassword: 'changed123' })).statusCode, 400);
  assert.equal((await req('POST', '/api/auth/change-password', refreshedStaff.token, { currentPassword: 'changed123', newPassword: 'another123' })).statusCode, 200);
  assert.equal((await login(staff.username, 'another123')).user.id, staff.id);

  // Lock a dojo: members can no longer login, then restore it.
  assert.equal((await req('PATCH', `/api/admin/dojos/${cgAdmin.user.dojoId}`, admin.token, { status: 'LOCKED' })).statusCode, 200);
  assert.equal((await login('dojo_cg', 'dojo123', 403)).error, 'DOJO_LOCKED');
  assert.equal((await req('PATCH', `/api/admin/dojos/${cgAdmin.user.dojoId}`, admin.token, { status: 'ACTIVE' })).statusCode, 200);
  assert.equal((await login('dojo_cg', 'dojo123')).user.role, 'DOJO_ADMIN');

  const auditRes = await req('GET', '/api/admin/audit?limit=500', dojoAdmin.token);
  assert.equal(auditRes.statusCode, 200);
  assert.ok((auditRes.json() as any).auditLogs.length >= 10);

  console.log('E2E PASS: 40+ assertions across auth, roles, dynamic permissions, tenant isolation, student/class CRUD, enrollment, normal/makeup/bulk attendance, finalize, tuition/overpayment, account and dojo lock, password changes, audit');
} finally {
  await app.close();
  await prisma.$disconnect();
}
