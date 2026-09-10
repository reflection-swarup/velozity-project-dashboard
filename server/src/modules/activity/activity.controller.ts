import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import { assertProjectVisible } from '../projects/project.access';
import * as service from './activity.service';

export const feed = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const { limit, cursor, projectId } = req.query as unknown as {
    limit: number;
    cursor?: string;
    projectId?: string;
  };

  if (projectId) await assertProjectVisible(user, projectId);

  res.json(await service.getFeed(user, { limit, cursor, projectId }));
};

export const missed = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const { limit } = req.query as unknown as { limit: number };
  res.json(await service.getMissed(user, limit));
};

export const seen = async (req: Request, res: Response) => {
  await service.markSeen(currentUser(req).id);
  res.status(204).send();
};
