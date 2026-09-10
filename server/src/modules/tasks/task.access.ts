import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../../middleware/auth';

// Every task query starts from this scope, so no endpoint can leak a task the
// caller is not entitled to see.
export const taskScopeFilter = (user: AuthUser): Prisma.TaskWhereInput => {
  switch (user.role) {
    case 'ADMIN':
      return {};
    case 'PROJECT_MANAGER':
      return { project: { managerId: user.id } };
    case 'DEVELOPER':
      return { assigneeId: user.id };
  }
};
