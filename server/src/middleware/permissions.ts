import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RolePermission } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type PermissionKey = Exclude<keyof RolePermission, 'id' | 'dojoId' | 'role' | 'createdAt' | 'updatedAt'>;

export function requirePermission(permission: PermissionKey) {
  return async function permissionGuard(request: FastifyRequest, reply: FastifyReply) {
    if (request.user.role === 'SUPER_ADMIN' || request.user.role === 'DOJO_ADMIN') return;
    if (!request.user.dojoId) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: 'Tài khoản không thuộc võ đường hợp lệ.' });
    }

    const row = await prisma.rolePermission.findUnique({
      where: { dojoId_role: { dojoId: request.user.dojoId, role: request.user.role } }
    });

    if (!row || row[permission] !== true) {
      return reply.code(403).send({ error: 'FORBIDDEN', permission, message: 'Quản trị viên chưa cấp quyền cho thao tác này.' });
    }
  };
}
