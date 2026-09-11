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
  PUBLIC_API_URL: z.string().url().optional(),
  OVERDUE_CRON: z.string().default('*/5 * * * *'),
  // Off is only ever appropriate for a local stack, which the guard below
  // enforces: a deployment reachable from anything but localhost cannot start
  // with rate limiting disabled.
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SEED_ON_START: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const hostOf = (value: string) => {
  try {
    return new URL(value.trim()).host;
  } catch {
    return null;
  }
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

// A production build served to a loopback origin is a local run, not a
// deployment, so the https and Secure rules do not apply to it.
const isLocalOnly = (value: { CORS_ORIGIN: string }) =>
  value.CORS_ORIGIN.split(',').every((origin) => {
    const host = hostOf(origin);
    return host !== null && LOCAL_HOSTS.has(host.split(':')[0] ?? '');
  });

const isCrossSite = (value: { CORS_ORIGIN: string; PUBLIC_API_URL?: string }) => {
  const apiHost = value.PUBLIC_API_URL ? hostOf(value.PUBLIC_API_URL) : null;
  if (!apiHost) return false;
  return value.CORS_ORIGIN.split(',')
    .map(hostOf)
    .some((webHost) => webHost !== null && webHost !== apiHost);
};

const guarded = schema
  // Distinct secrets, so a leak of one never becomes a leak of both.
  .refine((value) => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'must not be the same value as JWT_ACCESS_SECRET',
  })
  // Browsers silently drop SameSite=None without Secure, which looks exactly
  // like a working login that forgets itself on reload. Fail at boot instead.
  .refine((value) => !(value.COOKIE_SAMESITE === 'none' && !value.COOKIE_SECURE), {
    path: ['COOKIE_SECURE'],
    message: 'must be true when COOKIE_SAMESITE is none, or the browser will reject the cookie',
  })
  // A cross-site deployment needs SameSite=None, because lax would stop the
  // refresh cookie ever reaching the API from the web origin. Only checked
  // when PUBLIC_API_URL is set, since that is what makes the split knowable.
  .refine((value) => !isCrossSite(value) || value.COOKIE_SAMESITE === 'none', {
    path: ['COOKIE_SAMESITE'],
    message:
      'must be none when the web origin differs from the API origin, otherwise the refresh cookie is never sent',
  })
  .refine(
    (value) => value.RATE_LIMIT_ENABLED || value.NODE_ENV !== 'production' || isLocalOnly(value),
    {
      path: ['RATE_LIMIT_ENABLED'],
      message: 'cannot be false for a deployment reachable from anywhere but localhost',
    },
  )
  // A deployed production API must use a Secure cookie over https origins.
  .refine(
    (value) => value.NODE_ENV !== 'production' || isLocalOnly(value) || value.COOKIE_SECURE,
    {
      path: ['COOKIE_SECURE'],
      message: 'must be true in production unless every CORS origin is localhost',
    },
  )
  .refine(
    (value) =>
      value.NODE_ENV !== 'production' ||
      isLocalOnly(value) ||
      value.CORS_ORIGIN.split(',').every((origin) => origin.trim().startsWith('https://')),
    {
      path: ['CORS_ORIGIN'],
      message: 'every production origin must be https unless it is localhost',
    },
  );

const parsed = guarded.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
