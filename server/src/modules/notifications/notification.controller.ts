import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import * as service from './notification.service';

export const list = async (req: Request, res: Response) => {
  const { limit, unreadOnly } = req.query as unknown as { limit: number; unreadOnly: boolean };
  res.json(await service.list(currentUser(req).id, { limit, unreadOnly }));
};

export const markRead = async (req: Request, res: Response) => {
  const count = await service.markRead(currentUser(req).id, req.params.id as string);
  res.json({ unreadCount: count });
};

export const markAllRead = async (req: Request, res: Response) => {
  const count = await service.markAllRead(currentUser(req).id);
  res.json({ unreadCount: count });
};
