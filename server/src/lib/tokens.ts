import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { unauthorized } from './errors';

export type AccessPayload = {
  sub: string;
  role: Role;
  name: string;
  type: 'access';
};

export type RefreshPayload = {
  sub: string;
  jti: string;
  family: string;
  type: 'refresh';
};

export const signAccessToken = (user: { id: string; role: Role; name: string }) =>
  jwt.sign({ sub: user.id, role: user.role, name: user.name, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);

export const signRefreshToken = (userId: string, family: string) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, jti, family, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  } as jwt.SignOptions);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, jti, expiresAt };
};

export const verifyAccessToken = (token: string): AccessPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    if (payload.type !== 'access') throw new Error('wrong token type');
    return payload;
  } catch {
    throw unauthorized('Access token is invalid or expired');
  }
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
    if (payload.type !== 'refresh') throw new Error('wrong token type');
    return payload;
  } catch {
    throw unauthorized('Refresh token is invalid or expired');
  }
};

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
