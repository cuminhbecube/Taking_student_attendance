import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { studentRoutes } from './routes/students.js';
import { attendanceRoutes } from './routes/attendance.js';
import { tuitionRoutes } from './routes/tuition.js';

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: true
  });

  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/api/health', async () => ({ status: 'ok', service: 'taking-student-attendance-api' }));
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(classRoutes, { prefix: '/api/classes' });
  await app.register(studentRoutes, { prefix: '/api/students' });
  await app.register(attendanceRoutes, { prefix: '/api/attendance' });
  await app.register(tuitionRoutes, { prefix: '/api/tuition' });

  return app;
}
