import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }

  const current = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: {
      id: true,
      username: true,
      role: true,
      dojoId: true,
      status: true,
      sessionVersion: true,
      dojo: { select: { status: true } }
    }
  });

  if (!current || current.status !== 'ACTIVE' || (current.dojo && current.dojo.status !== 'ACTIVE')) {
    return reply.code(401).send({ error: 'SESSION_REVOKED', message: 'Phiên đăng nhập đã bị thu hồi hoặc tài khoản không còn hoạt động.' });
  }
  if (request.user.ver !== current.sessionVersion) {
    return reply.code(401).send({ error: 'SESSION_REVOKED', message: 'Thông tin đăng nhập đã thay đổi. Vui lòng đăng nhập lại.' });
  }

  // Never trust stale authorization claims from an already-issued JWT. Role and
  // tenant membership are refreshed from the database before downstream guards run.
  request.user.role = current.role;
  request.user.dojoId = current.dojoId;
  request.user.username = current.username;
}

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Tài khoản không có quyền thực hiện thao tác này.' });
    }
  };
}

export function resolveDojoScope(request: FastifyRequest, requestedDojoId?: string | null): string | null {
  if (request.user.role === 'SUPER_ADMIN') return requestedDojoId ?? null;
  return request.user.dojoId;
}

export function assertDojoAccess(request: FastifyRequest, dojoId: string): boolean {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}
