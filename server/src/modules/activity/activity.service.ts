import type { ActivityLog, ActivityType, Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { AuthUser } from '../../middleware/auth';
import { emitActivity, type ActivityPayload } from '../../realtime/emit';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

type ActivityWithProject = ActivityLog & { project?: { name: string } | null };

export const serializeActivity = (activity: ActivityWithProject): ActivityPayload => ({
  id: activity.id,
  type: activity.type,
  projectId: activity.projectId,
  projectName: activity.project?.name,
  taskId: activity.taskId,
  taskNumber: activity.taskNumber,
  taskTitle: activity.taskTitle,
  actorId: activity.actorId,
  actorName: activity.actorName,
  fromStatus: activity.fromStatus,
  toStatus: activity.toStatus,
  message: activity.message,
  createdAt: activity.createdAt.toISOString(),
});

export const describeStatusChange = (
  actorName: string,
  taskNumber: number,
  from: TaskStatus,
  to: TaskStatus,
) => `${actorName} moved Task #${taskNumber} from ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`;

export type RecordActivityInput = {
  type: ActivityType;
  projectId: string;
  projectName: string;
  managerId: string;
  taskId?: string | null;
  taskNumber?: number | null;
  taskTitle?: string | null;
  assigneeIdAtEvent?: string | null;
  actorId: string | null;
  actorName: string;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  message: string;
};

// Writes the log row inside the caller's transaction and returns a payload the
// caller broadcasts only after the transaction commits.
export const recordActivity = async (
  client: Prisma.TransactionClient,
  input: RecordActivityInput,
): Promise<ActivityPayload> => {
  const created = await client.activityLog.create({
    data: {
      type: input.type,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      taskNumber: input.taskNumber ?? null,
      taskTitle: input.taskTitle ?? null,
      assigneeIdAtEvent: input.assigneeIdAtEvent ?? null,
      actorId: input.actorId,
      actorName: input.actorName,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      message: input.message,
    },
  });

  return serializeActivity({ ...created, project: { name: input.projectName } });
};

export const broadcastActivity = (
  payload: ActivityPayload,
  audience: { projectId: string; managerId: string; assigneeId?: string | null },
) => emitActivity(payload, audience);

// The feed scope mirrors the socket rooms: admin sees everything, a manager
// sees their own projects, a developer only events on their own tasks.
export const activityScope = (user: AuthUser): Prisma.ActivityLogWhereInput => {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'PROJECT_MANAGER':
      return { project: { managerId: user.id } };
    case 'DEVELOPER':
      return { assigneeIdAtEvent: user.id };
  }
};

export const getFeed = async (
  user: AuthUser,
  options: { limit: number; cursor?: string; projectId?: string },
) => {
  const where: Prisma.ActivityLogWhereInput = {
    ...activityScope(user),
    ...(options.projectId ? { projectId: options.projectId } : {}),
  };

  const items = await prisma.activityLog.findMany({
    where,
    include: { project: { select: { name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > options.limit;
  const page = hasMore ? items.slice(0, options.limit) : items;

  return {
    items: page.map(serializeActivity),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
};

// Catch-up after a reconnect is read from the database using the last seen
// timestamp we persist on socket disconnect.
export const getMissed = async (user: AuthUser, limit: number) => {
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastSeenAt: true },
  });

  const since = record?.lastSeenAt ?? new Date(0);

  const items = await prisma.activityLog.findMany({
    where: { ...activityScope(user), createdAt: { gt: since } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { since: since.toISOString(), items: items.map(serializeActivity) };
};

export const markSeen = (userId: string) =>
  prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
