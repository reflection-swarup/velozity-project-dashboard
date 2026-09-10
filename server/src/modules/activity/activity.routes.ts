import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './activity.controller';
import { feedQuerySchema, missedQuerySchema } from './activity.schemas';

export const activityRouter = Router();

activityRouter.use(requireAuth);
activityRouter.get('/', validate({ query: feedQuerySchema }), asyncHandler(controller.feed));
activityRouter.get('/missed', validate({ query: missedQuerySchema }), asyncHandler(controller.missed));
activityRouter.post('/seen', asyncHandler(controller.seen));
