import type { Prisma, Role, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { conflict, notFound } from '../../lib/errors';
import { hashPassword } from '../auth/auth.service';
import { presence } from '../../realtime/presence';
import { disconnectUser } from '../../realtime/emit';

const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUser = Pick<User, keyof typeof publicFields & keyof User>;

const withPresence = (user: PublicUser) => ({
  ...user,
  isOnline: presence.isOnline(user.id),
});

export const list = async (filters: { role?: Role; search?: string }) => {
  const users = await prisma.user.findMany({
    where: {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: publicFields,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  return users.map(withPresence);
};

export const create = async (input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict('A user with that email already exists');

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
    select: publicFields,
  });

  return withPresence(user);
};

export const update = async (
  id: string,
  input: { name?: string; role?: Role; isActive?: boolean },
) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound('User not found');

  const user = await prisma.user.update({ where: { id }, data: input, select: publicFields });

  const roleChanged = Boolean(input.role && input.role !== existing.role);
  const deactivated = input.isActive === false;

  // HTTP requests re-read the role every time, but an open socket was
  // authorised once at handshake. Revoke the refresh tokens and drop the
  // sockets together so neither channel keeps stale permissions.
  if (deactivated || roleChanged) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const dropped = disconnectUser(id, deactivated ? 'account deactivated' : 'role changed');
    if (dropped > 0) {
      logger.info({ userId: id, dropped, roleChanged, deactivated }, 'revoked live sessions');
    }
  }

  return withPresence(user);
};
