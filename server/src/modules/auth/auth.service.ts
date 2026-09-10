import crypto from 'node:crypto';
import argon2 from 'argon2';
import type { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { unauthorized } from '../../lib/errors';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/tokens';
import type { LoginInput } from './auth.schemas';

export type SessionUser = { id: string; name: string; email: string; role: Role };

type Session = { accessToken: string; refreshToken: string; expiresAt: Date; user: SessionUser };

const issueSession = async (user: SessionUser, family: string): Promise<Session> => {
  const accessToken = signAccessToken(user);
  const refresh = signRefreshToken(user.id, family);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh.token),
      family,
      expiresAt: refresh.expiresAt,
    },
  });

  return { accessToken, refreshToken: refresh.token, expiresAt: refresh.expiresAt, user };
};

export const login = async ({ email, password }: LoginInput): Promise<Session> => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw unauthorized('Invalid email or password');

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) throw unauthorized('Invalid email or password');

  return issueSession(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    crypto.randomUUID(),
  );
};

// Rotation with reuse detection: replaying an already-rotated token kills the
// whole family, so a stolen cookie cannot be used twice.
export const refresh = async (token: string | undefined): Promise<Session> => {
  if (!token) throw unauthorized('Refresh token cookie is missing');

  const payload = verifyRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!stored) throw unauthorized('Refresh token is not recognised');

  if (stored.revokedAt || stored.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: { family: stored.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Refresh token was already used');
  }

  if (!stored.user.isActive) throw unauthorized('Account is no longer active');

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { user } = stored;
  return issueSession(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    payload.family,
  );
};

export const logout = async (token: string | undefined) => {
  if (!token) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!stored) return;
  await prisma.refreshToken.updateMany({
    where: { family: stored.family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const hashPassword = (password: string) => argon2.hash(password);
