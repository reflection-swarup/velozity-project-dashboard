import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './task.controller';
import {
  createTaskSchema,
  idParamSchema,
  listTasksQuerySchema,
  updateStatusSchema,
  updateTaskSchema,
} from './task.schemas';

export const taskRouter = Router();

taskRouter.use(requireAuth);

taskRouter.get('/', validate({ query: listTasksQuerySchema }), asyncHandler(controller.list));

taskRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));

taskRouter.get(
  '/:id/activity',
  validate({ params: idParamSchema }),
  asyncHandler(controller.activity),
);

taskRouter.post(
  '/',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ body: createTaskSchema }),
  asyncHandler(controller.create),
);

taskRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTaskSchema }),
  asyncHandler(controller.update),
);

taskRouter.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateStatusSchema }),
  asyncHandler(controller.updateStatus),
);

taskRouter.delete(
  '/:id',
  requireRole('ADMIN', 'PROJECT_MANAGER'),
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
