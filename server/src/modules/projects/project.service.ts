import type { Prisma, ProjectStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';
import { broadcastActivity, recordActivity } from '../activity/activity.service';
import { pushNotification, queueNotification } from '../notifications/notification.service';
import { assertProjectManageable, assertProjectVisible, projectScopeFilter } from './project.access';

const projectInclude = {
  client: { select: { id: true, name: true, company: true } },
  manager: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ProjectInclude;

// A developer only ever sees counts for the tasks assigned to them.
const taskScopeFor = (user: AuthUser): Prisma.TaskWhereInput =>
  user.role === 'DEVELOPER' ? { assigneeId: user.id } : {};

const emptyStatusCounts = (): Record<TaskStatus, number> => ({
  TODO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
});

const sumCounts = (counts: Record<TaskStatus, number>) =>
  Object.values(counts).reduce((total, value) => total + value, 0);

export const list = async (
  user: AuthUser,
  filters: { status?: ProjectStatus; clientId?: string; managerId?: string; search?: string },
) => {
  if (filters.managerId && user.role === 'PROJECT_MANAGER' && filters.managerId !== user.id) {
    throw forbidden('You can only list your own projects');
  }

  // Same rule as the task list: the role scope and the caller's filters are
  // combined with AND, so a filter can never replace the scope key it shares a
  // name with.
  const where: Prisma.ProjectWhereInput = {
    AND: [
      projectScopeFilter(user),
      {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.managerId ? { managerId: filters.managerId } : {}),
        ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
      },
    ],
  };

  const projects = await prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });

  const projectIds = projects.map((project) => project.id);
  const scope = taskScopeFor(user);

  const [grouped, overdue] = await Promise.all([
    prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds }, ...scope },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        isOverdue: true,
        status: { not: 'DONE' },
        ...scope,
      },
      _count: { _all: true },
    }),
  ]);

  return projects.map((project) => {
    const taskCounts = emptyStatusCounts();
    for (const row of grouped) {
      if (row.projectId === project.id) taskCounts[row.status] = row._count._all;
    }
    return {
      ...project,
      taskCounts,
      taskTotal: sumCounts(taskCounts),
      overdueCount: overdue.find((row) => row.projectId === project.id)?._count._all ?? 0,
    };
  });
};

export const getById = async (user: AuthUser, id: string) => {
  await assertProjectVisible(user, id);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      ...projectInclude,
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  });
  if (!project) throw notFound('Project not found');

  const scope = taskScopeFor(user);

  const [grouped, overdueCount] = await Promise.all([
    prisma.task.groupBy({
      by: ['status'],
      where: { projectId: id, ...scope },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: { projectId: id, isOverdue: true, status: { not: 'DONE' }, ...scope },
    }),
  ]);

  const taskCounts = emptyStatusCounts();
  for (const row of grouped) taskCounts[row.status] = row._count._all;

  return {
    ...project,
    members: project.members.map((member) => member.user),
    taskCounts,
    taskTotal: sumCounts(taskCounts),
    overdueCount,
  };
};

export const create = async (
  user: AuthUser,
  input: {
    name: string;
    description: string;
    clientId: string;
    managerId?: string;
    status: ProjectStatus;
    memberIds: string[];
  },
) => {
  const managerId = user.role === 'ADMIN' ? input.managerId ?? user.id : user.id;

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager) throw notFound('Manager not found');
  if (manager.role === 'DEVELOPER') throw badRequest('A developer cannot manage a project');

  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) throw notFound('Client not found');

  const { project, activity } = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        managerId,
        status: input.status,
        ...(input.memberIds.length
          ? { members: { create: input.memberIds.map((userId) => ({ userId })) } }
          : {}),
      },
      include: projectInclude,
    });

    const log = await recordActivity(tx, {
      type: 'PROJECT_CREATED',
      projectId: created.id,
      projectName: created.name,
      managerId: created.managerId,
      actorId: user.id,
      actorName: user.name,
      message: user.name + ' created project ' + created.name,
    });

    return { project: created, activity: log };
  });

  broadcastActivity(activity, { projectId: project.id, managerId: project.managerId });

  return { ...project, taskCounts: emptyStatusCounts(), taskTotal: 0, overdueCount: 0 };
};

export const update = async (
  user: AuthUser,
  id: string,
  input: {
    name?: string;
    description?: string;
    clientId?: string;
    managerId?: string;
    status?: ProjectStatus;
  },
) => {
  await assertProjectManageable(user, id);

  if (input.managerId && user.role !== 'ADMIN') {
    throw forbidden('Only an admin can reassign a project manager');
  }

  if (input.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!manager) throw notFound('Manager not found');
    if (manager.role === 'DEVELOPER') throw badRequest('A developer cannot manage a project');
  }

  return prisma.project.update({ where: { id }, data: input, include: projectInclude });
};

export const remove = async (user: AuthUser, id: string) => {
  await assertProjectManageable(user, id);
  await prisma.project.delete({ where: { id } });
};

// Onboarding decides someone's role; this decides who works on what. A manager
// can only do it on a project they own, which assertProjectManageable enforces.
export const addMember = async (user: AuthUser, id: string, userId: string) => {
  const project = await assertProjectManageable(user, id);

  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) throw notFound('User not found');
  if (member.role !== 'DEVELOPER') throw badRequest('Only developers are added to a project team');
  if (!member.isActive) throw badRequest('That account is not active');

  const already = await prisma.projectMember.count({ where: { projectId: id, userId } });
  if (already > 0) throw conflict('They are already on this project');

  const { activity, notification } = await prisma.$transaction(async (tx) => {
    await tx.projectMember.create({ data: { projectId: id, userId } });

    const log = await recordActivity(tx, {
      type: 'MEMBER_JOINED',
      projectId: project.id,
      projectName: project.name,
      managerId: project.managerId,
      assigneeIdAtEvent: userId,
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} added ${member.name} to ${project.name}`,
    });

    const queued = await queueNotification(tx, {
      userId,
      type: 'TASK_ASSIGNED',
      title: 'Added to a project',
      body: `${user.name} added you to ${project.name}`,
      projectId: project.id,
    });

    return { activity: log, notification: queued };
  });

  broadcastActivity(activity, {
    projectId: project.id,
    managerId: project.managerId,
    assigneeId: userId,
  });
  await pushNotification(notification);

  return { id: member.id, name: member.name, email: member.email, role: member.role };
};

export const removeMember = async (user: AuthUser, id: string, userId: string) => {
  const project = await assertProjectManageable(user, id);

  const member = await prisma.user.findUnique({ where: { id: userId } });
  const removed = await prisma.projectMember.deleteMany({ where: { projectId: id, userId } });
  if (removed.count === 0) throw notFound('They are not on this project');

  const activity = await prisma.$transaction((tx) =>
    recordActivity(tx, {
      type: 'MEMBER_REMOVED',
      projectId: project.id,
      projectName: project.name,
      managerId: project.managerId,
      assigneeIdAtEvent: userId,
      actorId: user.id,
      actorName: user.name,
      message: `${user.name} removed ${member?.name ?? 'a member'} from ${project.name}`,
    }),
  );

  broadcastActivity(activity, {
    projectId: project.id,
    managerId: project.managerId,
    assigneeId: userId,
  });
};
