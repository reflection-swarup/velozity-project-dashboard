import type { Notification, Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { emitTaskChanged } from '../../realtime/emit';
import {
  broadcastActivity,
  describeStatusChange,
  recordActivity,
  serializeActivity,
} from '../activity/activity.service';
import { pushNotification, queueNotification } from '../notifications/notification.service';
import { assertProjectManageable } from '../projects/project.access';
import { taskScopeFilter } from './task.access';
import type { ListTasksQuery } from './task.schemas';

const taskInclude = {
  project: { select: { id: true, name: true, managerId: true } },
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const serializeTask = (task: TaskWithRelations) => ({
  id: task.id,
  number: task.number,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate?.toISOString() ?? null,
  isOverdue: task.isOverdue && task.status !== 'DONE',
  overdueAt: task.overdueAt?.toISOString() ?? null,
  completedAt: task.completedAt?.toISOString() ?? null,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
  project: task.project,
  assignee: task.assignee,
  createdBy: task.createdBy,
});

export type TaskDto = ReturnType<typeof serializeTask>;

const buildOrderBy = (
  sort: ListTasksQuery['sort'],
  order: 'asc' | 'desc',
): Prisma.TaskOrderByWithRelationInput[] => {
  switch (sort) {
    case 'dueDate':
      return [{ dueDate: order }, { priority: 'desc' }];
    case 'createdAt':
      return [{ createdAt: order }];
    case 'status':
      return [{ status: order }, { priority: 'desc' }];
    default:
      return [{ priority: order }, { dueDate: 'asc' }];
  }
};

// A developer asking for somebody else is told no, rather than being handed a
// silently empty list.
const assertFilterWithinScope = (user: AuthUser, query: ListTasksQuery) => {
  if (user.role === 'DEVELOPER' && query.assigneeId && query.assigneeId !== user.id) {
    throw forbidden('You can only filter by your own assigned tasks');
  }
};

const buildWhere = (user: AuthUser, query: ListTasksQuery): Prisma.TaskWhereInput => {
  const dueDate: Prisma.DateTimeNullableFilter = {};
  if (query.dueFrom) dueDate.gte = query.dueFrom;
  if (query.dueTo) dueDate.lte = query.dueTo;

  const filters: Prisma.TaskWhereInput = {
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.status ? { status: { in: query.status as TaskStatus[] } } : {}),
    ...(query.priority ? { priority: { in: query.priority as TaskPriority[] } } : {}),
    ...(Object.keys(dueDate).length > 0 ? { dueDate } : {}),
    ...(query.overdue === true ? { isOverdue: true, status: { not: 'DONE' } } : {}),
    ...(query.overdue === false ? { isOverdue: false } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // The role scope and the caller's filters are combined with AND rather than
  // spread into one object. Spreading let a caller supplied key overwrite the
  // scope key of the same name, so `?assigneeId=<someone else>` replaced the
  // developer scope instead of narrowing it. Under AND a filter can only ever
  // narrow the result set.
  return { AND: [taskScopeFilter(user), filters] };
};

export const list = async (user: AuthUser, query: ListTasksQuery) => {
  assertFilterWithinScope(user, query);
  const where = buildWhere(user, query);

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [...buildOrderBy(query.sort, query.order), { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }),
    prisma.task.count({ where }),
  ]);

  const hasMore = tasks.length > query.limit;
  const page = hasMore ? tasks.slice(0, query.limit) : tasks;

  return {
    items: page.map(serializeTask),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    total,
  };
};

const findVisibleTask = async (user: AuthUser, id: string) => {
  const task = await prisma.task.findFirst({
    where: { id, ...taskScopeFilter(user) },
    include: taskInclude,
  });

  if (!task) {
    const exists = await prisma.task.count({ where: { id } });
    throw exists > 0
      ? forbidden('This task belongs to another team member')
      : notFound('Task not found');
  }

  return task;
};

export const getById = async (user: AuthUser, id: string) =>
  serializeTask(await findVisibleTask(user, id));

export const getActivity = async (user: AuthUser, id: string, limit: number) => {
  await findVisibleTask(user, id);

  const activities = await prisma.activityLog.findMany({
    where: { taskId: id },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { items: activities.map(serializeActivity) };
};

const assertAssignableDeveloper = async (assigneeId: string) => {
  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee) throw notFound('Assignee not found');
  if (assignee.role !== 'DEVELOPER') throw badRequest('Tasks can only be assigned to developers');
  if (!assignee.isActive) throw badRequest('Assignee is not an active user');
  return assignee;
};

export const create = async (
  user: AuthUser,
  input: {
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date | null;
    assigneeId?: string | null;
  },
) => {
  const project = await assertProjectManageable(user, input.projectId);
  if (input.assigneeId) await assertAssignableDeveloper(input.assigneeId);

  const now = new Date();
  const overdue = Boolean(input.dueDate && input.dueDate < now && input.status !== 'DONE');

  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        assigneeId: input.assigneeId ?? null,
        createdById: user.id,
        isOverdue: overdue,
        overdueAt: overdue ? now : null,
        completedAt: input.status === 'DONE' ? now : null,
      },
      include: taskInclude,
    });

    const activity = await recordActivity(tx, {
      type: 'TASK_CREATED',
      projectId: project.id,
      projectName: project.name,
      managerId: project.managerId,
      taskId: task.id,
      taskNumber: task.number,
      taskTitle: task.title,
      assigneeIdAtEvent: task.assigneeId,
      actorId: user.id,
      actorName: user.name,
      toStatus: task.status,
      message: `${user.name} created Task #${task.number} · ${task.title}`,
    });

    const notifications: Notification[] = [];
    if (task.assigneeId && task.assigneeId !== user.id) {
      notifications.push(
        await queueNotification(tx, {
          userId: task.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'New task assigned',
          body: `${user.name} assigned you Task #${task.number} · ${task.title}`,
          taskId: task.id,
          projectId: project.id,
        }),
      );
    }

    return { task, activity, notifications };
  });

  const dto = serializeTask(result.task);
  const audience = {
    projectId: project.id,
    managerId: project.managerId,
    assigneeId: result.task.assigneeId,
  };

  broadcastActivity(result.activity, audience);
  emitTaskChanged(dto, audience);
  await Promise.all(result.notifications.map(pushNotification));

  return dto;
};

type UpdateInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  assigneeId?: string | null;
};

// Developers may only move their own task between statuses; any other field in
// the payload is rejected rather than silently dropped.
const assertUpdateAllowed = (user: AuthUser, task: TaskWithRelations, input: UpdateInput) => {
  if (user.role === 'ADMIN') return;

  if (user.role === 'PROJECT_MANAGER') {
    if (task.project.managerId !== user.id) {
      throw forbidden('This project belongs to another manager');
    }
    return;
  }

  if (task.assigneeId !== user.id) throw forbidden('You can only update your own tasks');

  const attempted = Object.keys(input).filter((key) => key !== 'status');
  if (attempted.length > 0) {
    throw forbidden(`Developers can only change task status, not: ${attempted.join(', ')}`);
  }
};

export const update = async (user: AuthUser, id: string, input: UpdateInput) => {
  const task = await findVisibleTask(user, id);
  assertUpdateAllowed(user, task, input);

  if (input.assigneeId) await assertAssignableDeveloper(input.assigneeId);

  const now = new Date();
  const statusChanged = input.status !== undefined && input.status !== task.status;
  const assigneeChanged =
    input.assigneeId !== undefined && (input.assigneeId ?? null) !== task.assigneeId;
  const nextStatus = input.status ?? task.status;
  const nextDueDate = input.dueDate !== undefined ? input.dueDate : task.dueDate;
  const overdue = Boolean(nextDueDate && nextDueDate < now && nextStatus !== 'DONE');

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        isOverdue: overdue,
        overdueAt: overdue ? (task.overdueAt ?? now) : null,
        completedAt: nextStatus === 'DONE' ? (task.completedAt ?? now) : null,
      },
      include: taskInclude,
    });

    const activities = [];
    const notifications: Notification[] = [];

    if (statusChanged) {
      activities.push(
        await recordActivity(tx, {
          type: 'TASK_STATUS_CHANGED',
          projectId: updated.projectId,
          projectName: updated.project.name,
          managerId: updated.project.managerId,
          taskId: updated.id,
          taskNumber: updated.number,
          taskTitle: updated.title,
          assigneeIdAtEvent: updated.assigneeId,
          actorId: user.id,
          actorName: user.name,
          fromStatus: task.status,
          toStatus: updated.status,
          message: describeStatusChange(user.name, updated.number, task.status, updated.status),
        }),
      );

      if (updated.status === 'IN_REVIEW' && updated.project.managerId !== user.id) {
        notifications.push(
          await queueNotification(tx, {
            userId: updated.project.managerId,
            type: 'TASK_IN_REVIEW',
            title: 'Task ready for review',
            body: `${user.name} moved Task #${updated.number} · ${updated.title} to In Review`,
            taskId: updated.id,
            projectId: updated.projectId,
          }),
        );
      }
    }

    if (assigneeChanged) {
      activities.push(
        await recordActivity(tx, {
          type: 'TASK_ASSIGNED',
          projectId: updated.projectId,
          projectName: updated.project.name,
          managerId: updated.project.managerId,
          taskId: updated.id,
          taskNumber: updated.number,
          taskTitle: updated.title,
          assigneeIdAtEvent: updated.assigneeId,
          actorId: user.id,
          actorName: user.name,
          message: updated.assignee
            ? `${user.name} assigned Task #${updated.number} to ${updated.assignee.name}`
            : `${user.name} unassigned Task #${updated.number}`,
        }),
      );

      if (updated.assigneeId && updated.assigneeId !== user.id) {
        notifications.push(
          await queueNotification(tx, {
            userId: updated.assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            body: `${user.name} assigned you Task #${updated.number} · ${updated.title}`,
            taskId: updated.id,
            projectId: updated.projectId,
          }),
        );
      }
    }

    const otherFields = Object.keys(input).filter(
      (key) => key !== 'status' && key !== 'assigneeId',
    );
    if (otherFields.length > 0) {
      activities.push(
        await recordActivity(tx, {
          type: 'TASK_UPDATED',
          projectId: updated.projectId,
          projectName: updated.project.name,
          managerId: updated.project.managerId,
          taskId: updated.id,
          taskNumber: updated.number,
          taskTitle: updated.title,
          assigneeIdAtEvent: updated.assigneeId,
          actorId: user.id,
          actorName: user.name,
          message: `${user.name} updated ${otherFields.join(', ')} on Task #${updated.number}`,
        }),
      );
    }

    return { task: updated, activities, notifications };
  });

  const dto = serializeTask(result.task);
  const audience = {
    projectId: result.task.projectId,
    managerId: result.task.project.managerId,
    assigneeId: result.task.assigneeId,
    previousAssigneeId: task.assigneeId,
  };

  for (const activity of result.activities) broadcastActivity(activity, audience);
  emitTaskChanged(dto, audience);
  await Promise.all(result.notifications.map(pushNotification));

  return dto;
};

export const remove = async (user: AuthUser, id: string) => {
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) throw notFound('Task not found');
  await assertProjectManageable(user, task.projectId);

  const activity = await prisma.$transaction(async (tx) => {
    const log = await recordActivity(tx, {
      type: 'TASK_DELETED',
      projectId: task.projectId,
      projectName: task.project.name,
      managerId: task.project.managerId,
      taskNumber: task.number,
      taskTitle: task.title,
      assigneeIdAtEvent: task.assigneeId,
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} deleted Task #${task.number} · ${task.title}`,
    });
    await tx.task.delete({ where: { id } });
    return log;
  });

  const audience = {
    projectId: task.projectId,
    managerId: task.project.managerId,
    assigneeId: task.assigneeId,
  };

  broadcastActivity(activity, audience);
  emitTaskChanged({ id: task.id, deleted: true }, audience);
};
