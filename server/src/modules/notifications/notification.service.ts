import type { Notification, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { emitNotification, emitUnreadCount } from '../../realtime/emit';

export const serializeNotification = (n: Notification) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  taskId: n.taskId,
  projectId: n.projectId,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

export const unreadCount = (userId: string) =>
  prisma.notification.count({ where: { userId, readAt: null } });

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  taskId?: string | null;
  projectId?: string | null;
};

export const queueNotification = (
  client: Prisma.TransactionClient,
  input: CreateNotificationInput,
) =>
  client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
    },
  });

export const pushNotification = async (notification: Notification) => {
  const count = await unreadCount(notification.userId);
  emitNotification(notification.userId, serializeNotification(notification), count);
};

export const list = async (userId: string, options: { limit: number; unreadOnly: boolean }) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(options.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: options.limit,
    }),
    unreadCount(userId),
  ]);

  return { items: items.map(serializeNotification), unreadCount: unread };
};

export const markRead = async (userId: string, id: string) => {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  const count = await unreadCount(userId);
  emitUnreadCount(userId, count);
  return count;
};

export const markAllRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  emitUnreadCount(userId, 0);
  return 0;
};
