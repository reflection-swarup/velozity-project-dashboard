import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { corsOrigins } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { verifyAccessToken } from '../lib/tokens';
import type { AuthUser } from '../middleware/auth';
import { canSubscribeToProjectFeed } from '../modules/projects/project.access';
import { emitPresence, registerIo } from './emit';
import { presence } from './presence';
import { rooms } from './rooms';

declare module 'socket.io' {
  interface Socket {
    user?: AuthUser;
  }
}

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    transports: ['websocket'],
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));

      socket.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user!;

    socket.join(rooms.user(user.id));
    if (user.role === 'ADMIN') socket.join(rooms.global);

    const becameOnline = presence.add(user.id, socket.id);
    if (becameOnline) emitPresence();
    socket.emit('presence:update', {
      onlineCount: presence.count(),
      onlineUserIds: user.role === 'ADMIN' ? presence.onlineUserIds() : [],
    });

    socket.on('project:subscribe', async (projectId: string, ack?: (ok: boolean) => void) => {
      const allowed = typeof projectId === 'string' && (await canSubscribeToProjectFeed(user, projectId));
      if (allowed) socket.join(rooms.project(projectId));
      ack?.(allowed);
    });

    socket.on('project:unsubscribe', (projectId: string) => {
      if (typeof projectId === 'string') socket.leave(rooms.project(projectId));
    });

    socket.on('disconnect', async () => {
      const wentOffline = presence.remove(user.id, socket.id);
      if (!wentOffline) return;
      emitPresence();
      await prisma.user
        .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
        .catch((err) => logger.warn({ err }, 'failed to persist lastSeenAt'));
    });
  });

  registerIo(io);
  return io;
};
