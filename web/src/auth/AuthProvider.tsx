import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '../lib/api';
import type { Role, User } from '../types';

type AuthState = {
  user: User | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const queryClient = useQueryClient();

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  // On a reload there is no token in memory, so the refresh cookie is the only
  // thing that can restore the session.
  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((session) => {
        if (cancelled) return;
        setAccessToken(session.accessToken);
        setToken(session.accessToken);
        setUser(session.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionLostHandler(clearSession);
    return () => setSessionLostHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api.post<{ accessToken: string; user: User }>('/api/auth/login', {
        email,
        password,
      });
      setAccessToken(session.accessToken);
      setToken(session.accessToken);
      setUser(session.user);
      setStatus('authenticated');
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      status,
      login,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [user, token, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
