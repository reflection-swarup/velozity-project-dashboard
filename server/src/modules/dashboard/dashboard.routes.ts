import { Router } from 'express';
import { asyncHandler } from '../../lib/async';
import { currentUser, requireAuth } from '../../middleware/auth';
import { getDashboard } from './dashboard.service';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getDashboard(currentUser(req)));
  }),
);
