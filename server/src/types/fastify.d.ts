import '@fastify/jwt';
import type { UserRole } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: UserRole;
      dojoId: string | null;
      username: string;
      ver: number;
    };
    user: {
      sub: string;
      role: UserRole;
      dojoId: string | null;
      username: string;
      ver: number;
    };
  }
}
