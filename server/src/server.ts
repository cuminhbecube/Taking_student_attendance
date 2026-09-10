import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './routes/auth.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true
});

await app.register(jwt, { secret: env.JWT_SECRET });

app.get('/api/health', async () => ({ status: 'ok', service: 'taking-student-attendance-api' }));
await app.register(authRoutes, { prefix: '/api/auth' });

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
