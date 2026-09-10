import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './notification.controller';
import { idParamSchema, listQuerySchema } from './notification.schemas';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get('/', validate({ query: listQuerySchema }), asyncHandler(controller.list));
notificationRouter.patch('/read-all', asyncHandler(controller.markAllRead));
notificationRouter.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  asyncHandler(controller.markRead),
);
