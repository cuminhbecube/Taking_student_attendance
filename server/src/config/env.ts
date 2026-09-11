import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

export const env = envSchema.parse(process.env);
