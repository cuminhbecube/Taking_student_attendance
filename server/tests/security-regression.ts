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
  const admin = await login('hanoikid', '123456');
  const username = `claim_${Date.now()}`;
  const password = 'claimTest123';

  const create = await call('POST', '/api/admin/users', admin.token, {
    username,
    password,
    fullName: 'Stale Claim Regression',
    role: 'COACH',
    dojoId: admin.user.dojoId
  });
  assert.equal(create.statusCode, 201, create.body);
  const staff = (create.json() as any).user;
  const staffLogin = await login(username, password);
  const staleToken = staffLogin.token;

  // A COACH is denied student creation by default.
  let response = await call('POST', '/api/students', staleToken, {
    code: `DENIED${Date.now()}`,
    name: 'Denied Student'
  });
  assert.equal(response.statusCode, 403, response.body);

  // Change role in DB. The already-issued token must now behave as TEACHER,
  // because authenticate refreshes role/tenant from DB before permission guards.
  response = await call('PATCH', `/api/admin/users/${staff.id}`, admin.token, { role: 'TEACHER' });
  assert.equal(response.statusCode, 200, response.body);

  const studentCode = `CLAIM${Date.now()}`;
  response = await call('POST', '/api/students', staleToken, {
    code: studentCode,
    name: 'Role Refresh Student'
  });
  assert.equal(response.statusCode, 201, response.body);
  const createdStudent = (response.json() as any).student;

  // Locking the account must revoke the same already-issued token immediately.
  response = await call('PATCH', `/api/admin/users/${staff.id}`, admin.token, { status: 'LOCKED' });
  assert.equal(response.statusCode, 200, response.body);
  response = await call('GET', '/api/students', staleToken);
  assert.equal(response.statusCode, 401, response.body);
  assert.equal((response.json() as any).error, 'SESSION_REVOKED');

  // Restore for cleanup and verify a fresh login can be issued again.
  response = await call('PATCH', `/api/admin/users/${staff.id}`, admin.token, { status: 'ACTIVE' });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal((await login(username, password)).user.role, 'TEACHER');

  await prisma.student.delete({ where: { id: createdStudent.id } });
  await prisma.user.delete({ where: { id: staff.id } });
  console.log('SECURITY REGRESSION PASS: stale JWT role/tenant claims refresh from DB and account lock revokes old token');
} finally {
  await app.close();
  await prisma.$disconnect();
}
