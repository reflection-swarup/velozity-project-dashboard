import type { Server } from 'socket.io';
import { rooms } from './rooms';
import { presence } from './presence';

let io: Server | null = null;

export const registerIo = (server: Server) => {
  io = server;
};

export type ActivityPayload = {
  id: string;
  type: string;
  projectId: string;
  projectName?: string;
  taskId: string | null;
  taskNumber: number | null;
  taskTitle: string | null;
  actorId: string | null;
  actorName: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string;
  createdAt: string;
};

type ActivityAudience = {
  projectId: string;
  managerId: string;
  assigneeId?: string | null;
};

// One chained emit keeps a socket that sits in several of these rooms from
// receiving the same event twice.
export const emitActivity = (activity: ActivityPayload, audience: ActivityAudience) => {
  if (!io) return;
  let channel = io.to(rooms.global).to(rooms.project(audience.projectId)).to(rooms.user(audience.managerId));
  if (audience.assigneeId) channel = channel.to(rooms.user(audience.assigneeId));
  channel.emit('activity:new', activity);
};

export const emitTaskChanged = (
  task: unknown,
  audience: ActivityAudience & { previousAssigneeId?: string | null },
) => {
  if (!io) return;
  let channel = io.to(rooms.global).to(rooms.project(audience.projectId)).to(rooms.user(audience.managerId));
  if (audience.assigneeId) channel = channel.to(rooms.user(audience.assigneeId));
  if (audience.previousAssigneeId && audience.previousAssigneeId !== audience.assigneeId) {
    channel = channel.to(rooms.user(audience.previousAssigneeId));
  }
  channel.emit('task:changed', task);
};

export const emitNotification = (
  userId: string,
  notification: unknown,
  unreadCount: number,
) => {
  io?.to(rooms.user(userId)).emit('notification:new', { notification, unreadCount });
};

export const emitUnreadCount = (userId: string, unreadCount: number) => {
  io?.to(rooms.user(userId)).emit('notification:count', { unreadCount });
};

export const emitPresence = () => {
  io?.to(rooms.global).emit('presence:update', {
    onlineCount: presence.count(),
    onlineUserIds: presence.onlineUserIds(),
  });
};
