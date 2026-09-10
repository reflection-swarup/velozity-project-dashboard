import type { Project } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { forbidden, notFound } from '../../lib/errors';
import type { AuthUser } from '../../middleware/auth';

export const projectScopeFilter = (user: AuthUser) => {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'PROJECT_MANAGER':
      return { managerId: user.id };
    case 'DEVELOPER':
      return { tasks: { some: { assigneeId: user.id } } };
  }
};

export const assertProjectVisible = async (user: AuthUser, projectId: string): Promise<Project> => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project not found');

  if (user.role === 'ADMIN') return project;

  if (user.role === 'PROJECT_MANAGER') {
    if (project.managerId !== user.id) throw forbidden('This project belongs to another manager');
    return project;
  }

  const assigned = await prisma.task.count({
    where: { projectId, assigneeId: user.id },
  });
  if (assigned === 0) throw forbidden('You have no tasks on this project');
  return project;
};

export const assertProjectManageable = async (
  user: AuthUser,
  projectId: string,
): Promise<Project> => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project not found');
  if (user.role === 'ADMIN') return project;
  if (user.role === 'PROJECT_MANAGER' && project.managerId === user.id) return project;
  throw forbidden('Only an admin or the owning project manager can change this project');
};

// Developers never join a project feed room; their events arrive on their
// personal room so they cannot observe another developer's tasks.
export const canSubscribeToProjectFeed = async (user: AuthUser, projectId: string) => {
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'PROJECT_MANAGER') return false;
  const owned = await prisma.project.count({ where: { id: projectId, managerId: user.id } });
  return owned > 0;
};
