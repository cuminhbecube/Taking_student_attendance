import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { studentRoutes } from './routes/students.js';
import { attendanceRoutes } from './routes/attendance.js';
import { tuitionRoutes } from './routes/tuition.js';
import { adminRoutes } from './routes/admin.js';

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test', trustProxy: true, bodyLimit: 1_000_000 });

  await app.register(helmet, { global: true, contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return reply.code(409).send({ error: 'DUPLICATE', message: 'Dữ liệu đã tồn tại.' });
      if (error.code === 'P2025') return reply.code(404).send({ error: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu.' });
    }
    if ((error as any).statusCode === 429) return reply.code(429).send({ error: 'RATE_LIMITED', message: 'Thao tác quá nhanh. Vui lòng thử lại sau.' });
    app.log.error(error);
    return reply.code((error as any).statusCode && (error as any).statusCode < 500 ? (error as any).statusCode : 500).send({ error: 'INTERNAL_ERROR', message: 'Máy chủ gặp lỗi khi xử lý yêu cầu.' });
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'taking-student-attendance-api' }));
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(classRoutes, { prefix: '/api/classes' });
  await app.register(studentRoutes, { prefix: '/api/students' });
  await app.register(attendanceRoutes, { prefix: '/api/attendance' });
  await app.register(tuitionRoutes, { prefix: '/api/tuition' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
