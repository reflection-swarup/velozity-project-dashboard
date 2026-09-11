import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  OVERDUE_CRON: z.string().default('*/5 * * * *'),
  SEED_ON_START: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

// Distinct secrets, so a leak of one never becomes a leak of both.
const guarded = schema.refine((value) => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
  path: ['JWT_REFRESH_SECRET'],
  message: 'must not be the same value as JWT_ACCESS_SECRET',
});

const parsed = guarded.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
