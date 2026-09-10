import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from './auth.cookie';
import * as authService from './auth.service';

export const login = async (req: Request, res: Response) => {
  const session = await authService.login(req.body);
  setRefreshCookie(res, session.refreshToken, session.expiresAt);
  res.json({ accessToken: session.accessToken, user: session.user });
};

export const refresh = async (req: Request, res: Response) => {
  const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  setRefreshCookie(res, session.refreshToken, session.expiresAt);
  res.json({ accessToken: session.accessToken, user: session.user });
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.status(204).send();
};

export const me = async (req: Request, res: Response) => {
  res.json({ user: currentUser(req) });
};
