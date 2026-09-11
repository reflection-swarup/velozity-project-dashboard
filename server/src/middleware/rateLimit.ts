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
  skip: () => env.NODE_ENV === 'test',
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

// Signup is the only unauthenticated write in the API, so it is limited, but
// not so tightly that a genuine onboarding wave from one office IP gets locked
// out. Rejected attempts do not consume the allowance, since a typo should not
// count against a real person.
export const signupLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  skipFailedRequests: true,
  message: message(60),
});

export const publicReadLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 60,
  message: message(10),
});
