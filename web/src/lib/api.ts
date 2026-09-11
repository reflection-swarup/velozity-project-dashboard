export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.error?.message ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code ?? 'UNKNOWN';
    this.details = body?.error?.details;
  }
}

// The access token lives in memory only. Nothing about the session is written
// to localStorage, so a page reload restores it from the refresh cookie.
let accessToken: string | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setSessionLostHandler = (handler: (() => void) | null) => {
  onSessionLost = handler;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  retryOnUnauthorized?: boolean;
};

const parse = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const refreshEndpoint = `${API_URL}/api/auth/refresh`;

// A single refresh is shared by every request that hit a 401 at once, so a
// burst of parallel calls cannot rotate the cookie more than once.
let refreshInFlight: Promise<string | null> | null = null;

const refreshAccessToken = () => {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(refreshEndpoint, { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const body = await parse(res);
      const token = body?.accessToken ?? null;
      if (token) accessToken = token;
      return token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, signal, retryOnUnauthorized = true } = options;

  const send = () =>
    fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });

  let res = await send();

  if (res.status === 401 && retryOnUnauthorized && !path.startsWith('/api/auth/')) {
    const token = await refreshAccessToken();
    if (!token) {
      accessToken = null;
      onSessionLost?.();
      throw new ApiError(401, await parse(res), 'Your session has expired');
    }
    res = await send();
  }

  if (!res.ok) throw new ApiError(res.status, await parse(res), res.statusText);
  if (res.status === 204) return undefined as T;

  return (await parse(res)) as T;
};

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const refreshSession = () =>
  request<{ accessToken: string; user: import('../types').User }>('/api/auth/refresh', {
    method: 'POST',
    retryOnUnauthorized: false,
  });
