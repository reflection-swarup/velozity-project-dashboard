import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './project.controller';
import {
  createProjectSchema,
  idParamSchema,
  listProjectsQuerySchema,
  memberParamSchema,
  memberSchema,
  updateProjectSchema,
} from './project.schemas';

export const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(controller.list),
);

projectRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(controller.getById),
);

projectRouter.post(
  '/',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ body: createProjectSchema }),
  asyncHandler(controller.create),
);

projectRouter.patch(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema, body: updateProjectSchema }),
  asyncHandler(controller.update),
);

projectRouter.delete(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);

projectRouter.post(
  '/:id/members',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema, body: memberSchema }),
  asyncHandler(controller.addMember),
);

projectRouter.delete(
  '/:id/members/:userId',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: memberParamSchema }),
  asyncHandler(controller.removeMember),
);
