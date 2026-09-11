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
  const hnk = await login('hanoikid', '123456');
  const cg = await login('dojo_cg', 'dojo123');

  // Search regression: Vietnamese diacritics and đ/Đ must be searchable without accents.
  const code = `SEARCH${Date.now()}`;
  const createdStudent = await prisma.student.create({
    data: {
      dojoId: hnk.user.dojoId,
      code,
      name: 'Nguyễn Đức Anh',
      parentPhone: '0912345678',
      contactName: 'Nguyễn Văn Bố',
      address: 'Hà Đông, Hà Nội',
      belt: 'Đai Trắng'
    }
  });

  let search = await call('GET', '/api/students?q=nguyen%20duc', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented name search failed');

  search = await call('GET', '/api/students?q=dai%20trang', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented belt search failed');

  search = await call('GET', '/api/students?q=nguyen%20van%20bo', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented contact search failed');

  search = await call('GET', '/api/students?q=ha%20dong', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented address search failed');

  search = await call('GET', '/api/students?q=0912345678', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'phone search failed');

  const foreignSearch = await call('GET', '/api/students?q=nguyen%20duc', cg.token);
  assert.equal(foreignSearch.statusCode, 200, foreignSearch.body);
  assert.ok(!(foreignSearch.json() as any).students.some((s: any) => s.id === createdStudent.id), 'student search leaked across tenants');

  // Student profile update regression: validation, normalization, audit and optimistic concurrency.
  let detail = await call('GET', `/api/students/${createdStudent.id}`, hnk.token);
  assert.equal(detail.statusCode, 200, detail.body);
  const originalUpdatedAt = (detail.json() as any).student.updatedAt;

  let response = await call('PATCH', `/api/students/${createdStudent.id}`, hnk.token, {
    code,
    name: 'Nguyễn Đức Anh Updated',
    gender: 'MALE',
    dob: '2010-05-10',
    belt: '  Đai Vàng  ',
    parentPhone: ' 0912000111 ',
    contactName: ' Nguyễn Văn A ',
    address: ' Hà Đông ',
    notes: '   ',
    expectedUpdatedAt: originalUpdatedAt
  });
  assert.equal(response.statusCode, 200, response.body);
  const updatedStudent = (response.json() as any).student;
  assert.equal(updatedStudent.name, 'Nguyễn Đức Anh Updated');
  assert.equal(updatedStudent.gender, 'MALE');
  assert.equal(updatedStudent.belt, 'Đai Vàng');
  assert.equal(updatedStudent.parentPhone, '0912000111');
  assert.equal(updatedStudent.contactName, 'Nguyễn Văn A');
  assert.equal(updatedStudent.address, 'Hà Đông');
  assert.equal(updatedStudent.notes, null);

  const audit = await prisma.auditLog.findFirst({ where: { entityType: 'Student', entityId: createdStudent.id, action: 'STUDENT_UPDATED' }, orderBy: { createdAt: 'desc' } });
  assert.ok(audit?.beforeJson, 'student audit beforeJson missing');
  assert.ok(audit?.afterJson, 'student audit afterJson missing');
  assert.equal((audit!.afterJson as any).name, 'Nguyễn Đức Anh Updated');

  // Stale browser data must not overwrite a newer edit.
  response = await call('PATCH', `/api/students/${createdStudent.id}`, hnk.token, {
    name: 'Stale overwrite',
    expectedUpdatedAt: originalUpdatedAt
  });
  assert.equal(response.statusCode, 409, response.body);
  assert.equal((response.json() as any).error, 'STUDENT_CONFLICT');

  // Cross-tenant modification must remain forbidden.
  response = await call('PATCH', `/api/students/${createdStudent.id}`, cg.token, { name: 'Tenant takeover' });
  assert.equal(response.statusCode, 403, response.body);

  // Future DOB is invalid.
  response = await call('PATCH', `/api/students/${createdStudent.id}`, hnk.token, { dob: '2999-01-01' });
  assert.equal(response.statusCode, 400, response.body);
  assert.equal((response.json() as any).error, 'DOB_IN_FUTURE');

  // Student code remains unique within one dojo.
  const duplicateStudent = await prisma.student.create({
    data: { dojoId: hnk.user.dojoId, code: `DUP${Date.now()}`, name: 'Duplicate Code Holder' }
  });
  response = await call('PATCH', `/api/students/${createdStudent.id}`, hnk.token, { code: duplicateStudent.code });
  assert.equal(response.statusCode, 409, response.body);
  assert.equal((response.json() as any).error, 'STUDENT_CODE_EXISTS');

  // Class lifecycle regression: create -> patch -> delete must work for an empty class.
  const classCode = `RG${Date.now()}`;
  response = await call('POST', '/api/classes', hnk.token, {
    code: classCode,
    name: 'Lớp Regression',
    activeDays: [2, 5],
    startTime: '18:00',
    endTime: '19:30',
    venue: 'Phòng Test'
  });
  assert.equal(response.statusCode, 201, response.body);
  const dojoClass = (response.json() as any).class;
  assert.equal(dojoClass.code, classCode.toUpperCase());

  response = await call('PATCH', `/api/classes/${dojoClass.id}`, hnk.token, {
    name: 'Lớp Regression Updated',
    activeDays: [3, 6],
    venue: 'Phòng Test 2'
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal((response.json() as any).class.name, 'Lớp Regression Updated');

  const foreignPatch = await call('PATCH', `/api/classes/${dojoClass.id}`, cg.token, { name: 'Tenant takeover' });
  assert.equal(foreignPatch.statusCode, 403, foreignPatch.body);
  const foreignDelete = await call('DELETE', `/api/classes/${dojoClass.id}`, cg.token);
  assert.equal(foreignDelete.statusCode, 403, foreignDelete.body);

  response = await call('DELETE', `/api/classes/${dojoClass.id}`, hnk.token);
  assert.equal(response.statusCode, 204, response.body);
  assert.equal(await prisma.dojoClass.count({ where: { id: dojoClass.id } }), 0);

  await prisma.student.delete({ where: { id: duplicateStudent.id } });
  await prisma.student.delete({ where: { id: createdStudent.id } });
  console.log('FUNCTIONAL REGRESSION PASS: student profile validation/conflict/audit, unaccented search, tenant isolation, class CRUD lifecycle');
} finally {
  await app.close();
  await prisma.$disconnect();
}
