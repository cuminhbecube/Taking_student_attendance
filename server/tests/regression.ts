import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

process.env.NODE_ENV = 'test';
const app = await buildApp();

async function call(method: string, url: string, token?: string, payload?: unknown) {
  return app.inject({ method: method as any, url, headers: token ? { authorization: `Bearer ${token}` } : undefined, payload });
}

async function login(username: string, password: string) {
  const res = await call('POST', '/api/auth/login', undefined, { username, password });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as any;
}

try {
  // Regression #0: browser auth must work through an HttpOnly cookie while
  // Bearer tokens remain available for API/E2E tooling.
  const cookieLogin = await call('POST', '/api/auth/login', undefined, { username: 'hanoikid', password: '123456' });
  assert.equal(cookieLogin.statusCode, 200, cookieLogin.body);
  const setCookieHeader = cookieLogin.headers['set-cookie'];
  assert.ok(setCookieHeader, 'login did not set ea_session cookie');
  const firstSetCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : String(setCookieHeader);
  assert.match(firstSetCookie, /ea_session=/i);
  assert.match(firstSetCookie, /HttpOnly/i);
  assert.match(firstSetCookie, /SameSite=Lax/i);
  const cookiePair = firstSetCookie.split(';')[0];
  const cookieMe = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookiePair } });
  assert.equal(cookieMe.statusCode, 200, cookieMe.body);
  assert.equal((cookieMe.json() as any).user.username, 'hanoikid');
  const cookieLogout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: cookiePair } });
  assert.equal(cookieLogout.statusCode, 200, cookieLogout.body);
  const clearHeader = cookieLogout.headers['set-cookie'];
  assert.ok(clearHeader, 'logout did not clear ea_session cookie');
  assert.match(Array.isArray(clearHeader) ? clearHeader[0] : String(clearHeader), /ea_session=/i);

  const hnk = await login('hanoikid', '123456');
  const teacher = await login('gv_lan', '123456');
  const coach = await login('hlv_tuan', '123456');

  const classes = (await call('GET', '/api/classes', hnk.token)).json() as any;
  const dojoClass = classes.classes.find((c: any) => c.code === 'TC') ?? classes.classes[0];
  assert.ok(dojoClass);

  const students = (await call('GET', '/api/students', hnk.token)).json() as any;
  const student = students.students.find((s: any) => s.code === 'HNK001');
  assert.ok(student);

  // Regression #1: same class + same UTC calendar day must resolve to one session,
  // even when clients send different clock times.
  const day = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const first = await call('POST', '/api/attendance/sessions', teacher.token, {
    classId: dojoClass.id,
    sessionDate: `${day}T01:15:00.000Z`,
    title: 'Regression morning'
  });
  assert.equal(first.statusCode, 201, first.body);
  const firstSession = (first.json() as any).session;

  const second = await call('POST', '/api/attendance/sessions', teacher.token, {
    classId: dojoClass.id,
    sessionDate: `${day}T20:45:00.000Z`,
    title: 'Regression evening'
  });
  assert.equal(second.statusCode, 201, second.body);
  const secondSession = (second.json() as any).session;
  assert.equal(secondSession.id, firstSession.id, 'same calendar day created duplicate attendance sessions');
  assert.equal(new Date(secondSession.sessionDate).getUTCHours(), 0);

  const countForDay = await prisma.attendanceSession.count({
    where: { classId: dojoClass.id, sessionDate: new Date(`${day}T00:00:00.000Z`) }
  });
  assert.equal(countForDay, 1);

  // Regression #2: stale device must not silently overwrite a newer attendance write.
  const initialWrite = await call('PUT', `/api/attendance/sessions/${firstSession.id}/records`, coach.token, {
    studentId: student.id,
    status: 'PRESENT',
    type: 'NORMAL',
    registeredClassId: dojoClass.id
  });
  assert.equal(initialWrite.statusCode, 200, initialWrite.body);
  const initialRecord = (initialWrite.json() as any).record;
  assert.ok(initialRecord.updatedAt);

  await new Promise(resolve => setTimeout(resolve, 10));
  const newerWrite = await call('PUT', `/api/attendance/sessions/${firstSession.id}/records`, coach.token, {
    studentId: student.id,
    status: 'LATE',
    type: 'NORMAL',
    registeredClassId: dojoClass.id,
    lateMinutes: 5,
    expectedUpdatedAt: initialRecord.updatedAt
  });
  assert.equal(newerWrite.statusCode, 200, newerWrite.body);
  const newerRecord = (newerWrite.json() as any).record;

  const staleWrite = await call('PUT', `/api/attendance/sessions/${firstSession.id}/records`, teacher.token, {
    studentId: student.id,
    status: 'ABSENT',
    type: 'NORMAL',
    registeredClassId: dojoClass.id,
    expectedUpdatedAt: initialRecord.updatedAt
  });
  assert.equal(staleWrite.statusCode, 409, staleWrite.body);
  assert.equal((staleWrite.json() as any).error, 'ATTENDANCE_CONFLICT');

  const detail = await call('GET', `/api/attendance/sessions/${firstSession.id}`, teacher.token);
  const currentRecord = (detail.json() as any).session.records.find((r: any) => r.studentId === student.id);
  assert.equal(currentRecord.status, 'LATE');
  assert.equal(currentRecord.updatedAt, newerRecord.updatedAt);

  // Regression #3: permission changes must take effect server-side immediately,
  // without issuing a new JWT.
  const grant = {
    dojoId: hnk.user.dojoId,
    canViewTuition: true,
    canEditTuition: true,
    canEditSchedule: true,
    canTakeAttendance: true,
    canAddStudent: true,
    canEditStudentInfo: true,
    canDeleteStudent: false,
    canAddDateSession: true,
    canExportData: true
  };
  assert.equal((await call('PUT', '/api/admin/permissions/TEACHER', hnk.token, grant)).statusCode, 200);
  assert.equal((await call('GET', '/api/tuition/invoices', teacher.token)).statusCode, 200);

  const revoke = { ...grant, canViewTuition: false, canEditTuition: false };
  assert.equal((await call('PUT', '/api/admin/permissions/TEACHER', hnk.token, revoke)).statusCode, 200);
  const deniedView = await call('GET', '/api/tuition/invoices', teacher.token);
  assert.equal(deniedView.statusCode, 403, deniedView.body);
  const deniedCreate = await call('POST', '/api/tuition/invoices', teacher.token, {
    studentId: student.id,
    monthKey: `REVOKE-${Date.now()}`,
    amountDue: 500000
  });
  assert.equal(deniedCreate.statusCode, 403, deniedCreate.body);

  const defaults = { ...revoke, canViewTuition: false, canEditTuition: false };
  await call('PUT', '/api/admin/permissions/TEACHER', hnk.token, defaults);

  console.log('REGRESSION PASS: HttpOnly cookie auth, session-day normalization, optimistic attendance conflict, immediate permission revocation');
} finally {
  await app.close();
  await prisma.$disconnect();
}
