import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const REFRESH_COOKIE = 'velozity_refresh';

const options = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/auth',
  ...(env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== 'localhost'
    ? { domain: env.COOKIE_DOMAIN }
    : {}),
});

export const setRefreshCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(REFRESH_COOKIE, token, { ...options(), expires: expiresAt });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, options());
};
