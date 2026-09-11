import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { notificationKeys, taskKeys } from '../hooks/keys';
import { prependActivityToFeeds } from './feedScope';
import type { Activity, Notification, Task } from '../types';

type Presence = { onlineCount: number; onlineUserIds: string[] };

export type SubscriptionState = 'pending' | 'joined' | 'refused';

type SocketState = {
  connected: boolean;
  presence: Presence;
  subscribeToProject: (
    projectId: string,
    onResult?: (state: SubscriptionState) => void,
  ) => () => void;
};

const SocketContext = createContext<SocketState | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, status } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence>({ onlineCount: 0, onlineUserIds: [] });

  const prependActivity = useCallback(
    (activity: Activity) => prependActivityToFeeds(queryClient, activity),
    [queryClient],
  );

  useEffect(() => {
    if (status !== 'authenticated' || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:update', (payload: Presence) => setPresence(payload));

    socket.on('activity:new', (activity: Activity) => {
      prependActivity(activity);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    // A task event can change any list the user is looking at, so the lists are
    // refetched while the single task cache is patched in place.
    socket.on('task:changed', (payload: Task | { id: string; deleted: true }) => {
      if ('deleted' in payload) {
        queryClient.removeQueries({ queryKey: taskKeys.detail(payload.id) });
      } else {
        queryClient.setQueryData(taskKeys.detail(payload.id), payload);
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on(
      'notification:new',
      ({ notification, unreadCount }: { notification: Notification; unreadCount: number }) => {
        queryClient.setQueryData<{ items: Notification[]; unreadCount: number }>(
          notificationKeys.list(),
          (current) =>
            current
              ? { items: [notification, ...current.items].slice(0, 20), unreadCount }
              : { items: [notification], unreadCount },
        );
      },
    );

    socket.on('notification:count', ({ unreadCount }: { unreadCount: number }) => {
      queryClient.setQueryData<{ items: Notification[]; unreadCount: number }>(
        notificationKeys.list(),
        (current) => (current ? { ...current, unreadCount } : current),
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, status, queryClient, prependActivity]);

  // Project rooms are authorised server side. The acknowledgement tells us
  // whether we actually joined, which matters because a developer is refused
  // the room on purpose and is served from their personal channel instead.
  const subscribeToProject = useCallback(
    (projectId: string, onResult?: (state: SubscriptionState) => void) => {
      const socket = socketRef.current;
      if (!socket) {
        onResult?.('pending');
        return () => undefined;
      }

      let cancelled = false;

      const join = () => {
        onResult?.('pending');
        socket.emit('project:subscribe', projectId, (allowed: boolean) => {
          if (cancelled) return;
          onResult?.(allowed ? 'joined' : 'refused');
        });
      };

      if (socket.connected) join();
      socket.on('connect', join);

      return () => {
        cancelled = true;
        socket.off('connect', join);
        if (socket.connected) socket.emit('project:unsubscribe', projectId);
      };
    },
    [],
  );

  const value = useMemo<SocketState>(
    () => ({ connected, presence, subscribeToProject }),
    [connected, presence, subscribeToProject],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used inside SocketProvider');
  return context;
};
