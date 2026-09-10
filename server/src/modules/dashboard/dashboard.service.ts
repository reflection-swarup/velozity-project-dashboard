import type { TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { AuthUser } from '../../middleware/auth';
import { presence } from '../../realtime/presence';
import { serializeTask } from '../tasks/task.service';
import { taskScopeFilter } from '../tasks/task.access';

const taskInclude = {
  project: { select: { id: true, name: true, managerId: true } },
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
};

const emptyStatusCounts = (): Record<TaskStatus, number> => ({
  TODO: 0,
  IN_PROGRESS: 0,
  IN_REVIEW: 0,
  DONE: 0,
});

const emptyPriorityCounts = (): Record<TaskPriority, number> => ({
  LOW: 0,
  MEDIUM: 0,
  HIGH: 0,
  CRITICAL: 0,
});

const endOfWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(23, 59, 59, 999);
  return date;
};

const statusCounts = async (where: object) => {
  const rows = await prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } });
  const counts = emptyStatusCounts();
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
};

const priorityCounts = async (where: object) => {
  const rows = await prisma.task.groupBy({ by: ['priority'], where, _count: { _all: true } });
  const counts = emptyPriorityCounts();
  for (const row of rows) counts[row.priority] = row._count._all;
  return counts;
};

const adminDashboard = async () => {
  const [projectTotal, tasksByStatus, tasksByPriority, overdueCount, userTotal, clientTotal] =
    await Promise.all([
      prisma.project.count(),
      statusCounts({}),
      priorityCounts({}),
      prisma.task.count({ where: { isOverdue: true, status: { not: 'DONE' } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.client.count(),
    ]);

  return {
    role: 'ADMIN' as const,
    projectTotal,
    taskTotal: Object.values(tasksByStatus).reduce((total, value) => total + value, 0),
    tasksByStatus,
    tasksByPriority,
    overdueCount,
    userTotal,
    clientTotal,
    onlineCount: presence.count(),
    onlineUserIds: presence.onlineUserIds(),
  };
};

const managerDashboard = async (user: AuthUser) => {
  const scope = { project: { managerId: user.id } };

  const [projects, tasksByStatus, tasksByPriority, overdueCount, upcoming] = await Promise.all([
    prisma.project.findMany({
      where: { managerId: user.id },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    statusCounts(scope),
    priorityCounts(scope),
    prisma.task.count({ where: { ...scope, isOverdue: true, status: { not: 'DONE' } } }),
    prisma.task.findMany({
      where: {
        ...scope,
        status: { not: 'DONE' },
        dueDate: { gte: new Date(), lte: endOfWeek() },
      },
      include: taskInclude,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 10,
    }),
  ]);

  const perProject = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projects.map((project) => project.id) } },
    _count: { _all: true },
  });

  return {
    role: 'PROJECT_MANAGER' as const,
    projectTotal: projects.length,
    taskTotal: Object.values(tasksByStatus).reduce((total, value) => total + value, 0),
    tasksByStatus,
    tasksByPriority,
    overdueCount,
    projects: projects.map((project) => {
      const counts = emptyStatusCounts();
      for (const row of perProject) {
        if (row.projectId === project.id) counts[row.status] = row._count._all;
      }
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        client: project.client,
        taskCounts: counts,
        taskTotal: Object.values(counts).reduce((total, value) => total + value, 0),
      };
    }),
    upcomingThisWeek: upcoming.map(serializeTask),
  };
};

const developerDashboard = async (user: AuthUser) => {
  const scope = taskScopeFilter(user);

  const [tasksByStatus, tasksByPriority, overdueCount, tasks] = await Promise.all([
    statusCounts(scope),
    priorityCounts(scope),
    prisma.task.count({ where: { ...scope, isOverdue: true, status: { not: 'DONE' } } }),
    prisma.task.findMany({
      where: scope,
      include: taskInclude,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 50,
    }),
  ]);

  return {
    role: 'DEVELOPER' as const,
    taskTotal: Object.values(tasksByStatus).reduce((total, value) => total + value, 0),
    tasksByStatus,
    tasksByPriority,
    overdueCount,
    tasks: tasks.map(serializeTask),
  };
};

export const getDashboard = (user: AuthUser) => {
  switch (user.role) {
    case 'ADMIN':
      return adminDashboard();
    case 'PROJECT_MANAGER':
      return managerDashboard(user);
    case 'DEVELOPER':
      return developerDashboard(user);
  }
};
