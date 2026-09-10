import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import * as service from './task.service';
import type { ListTasksQuery } from './task.schemas';

export const list = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTasksQuery;
  res.json(await service.list(currentUser(req), query));
};

export const getById = async (req: Request, res: Response) => {
  res.json({ task: await service.getById(currentUser(req), req.params.id as string) });
};

export const activity = async (req: Request, res: Response) => {
  res.json(await service.getActivity(currentUser(req), req.params.id as string, 50));
};

export const create = async (req: Request, res: Response) => {
  res.status(201).json({ task: await service.create(currentUser(req), req.body) });
};

export const update = async (req: Request, res: Response) => {
  res.json({ task: await service.update(currentUser(req), req.params.id as string, req.body) });
};

export const updateStatus = async (req: Request, res: Response) => {
  const task = await service.update(currentUser(req), req.params.id as string, {
    status: req.body.status,
  });
  res.json({ task });
};

export const remove = async (req: Request, res: Response) => {
  await service.remove(currentUser(req), req.params.id as string);
  res.status(204).send();
};
