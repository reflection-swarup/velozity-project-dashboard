import type { Request, RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/tokens';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

const readBearer = (req: Request) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
};

// Role comes from the database, never from the token claim, so a tampered or
// stale token cannot escalate privileges.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readBearer(req);
    if (!token) throw unauthorized('Missing Authorization header');

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) throw unauthorized('Account is no longer active');

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(forbidden(`This action requires one of: ${allowed.join(', ')}`));
    }
    next();
  };

export const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw unauthorized();
  return req.user;
};
