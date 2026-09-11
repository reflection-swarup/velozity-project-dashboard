import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const message = (retryAfterMinutes: number) => ({
  error: {
    code: 'TOO_MANY_REQUESTS',
    message: `Too many attempts. Try again in ${retryAfterMinutes} minutes.`,
  },
});

const shared = {
  standardHeaders: true as const,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test' || !env.RATE_LIMIT_ENABLED,
};

// Only failed attempts count, which is what throttling a login is actually
// for: it slows credential guessing without ever locking out an office full of
// legitimate people sharing one NAT address.
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: message(10),
});
