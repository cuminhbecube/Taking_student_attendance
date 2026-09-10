import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@prisma/client';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Tài khoản không có quyền thực hiện thao tác này.' });
    }
  };
}

export function resolveDojoScope(request: FastifyRequest, requestedDojoId?: string | null): string | null {
  if (request.user.role === 'SUPER_ADMIN') {
    return requestedDojoId ?? null;
  }
  return request.user.dojoId;
}

export function assertDojoAccess(request: FastifyRequest, dojoId: string): boolean {
  return request.user.role === 'SUPER_ADMIN' || request.user.dojoId === dojoId;
}
