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
      belt: 'Đai Trắng'
    }
  });

  let search = await call('GET', '/api/students?q=nguyen%20duc', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented name search failed');

  search = await call('GET', '/api/students?q=dai%20trang', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'unaccented belt search failed');

  search = await call('GET', '/api/students?q=0912345678', hnk.token);
  assert.equal(search.statusCode, 200, search.body);
  assert.ok((search.json() as any).students.some((s: any) => s.id === createdStudent.id), 'phone search failed');

  const foreignSearch = await call('GET', '/api/students?q=nguyen%20duc', cg.token);
  assert.equal(foreignSearch.statusCode, 200, foreignSearch.body);
  assert.ok(!(foreignSearch.json() as any).students.some((s: any) => s.id === createdStudent.id), 'student search leaked across tenants');

  // Class lifecycle regression: create -> patch -> delete must work for an empty class.
  const classCode = `RG${Date.now()}`;
  let response = await call('POST', '/api/classes', hnk.token, {
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

  await prisma.student.delete({ where: { id: createdStudent.id } });
  console.log('FUNCTIONAL REGRESSION PASS: unaccented Vietnamese search, tenant isolation, class CRUD lifecycle');
} finally {
  await app.close();
  await prisma.$disconnect();
}
