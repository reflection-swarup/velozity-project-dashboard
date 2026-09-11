import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { API_URL } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { activityKeys, notificationKeys, taskKeys } from '../hooks/keys';
import type { Activity, Notification, Paginated, Task } from '../types';

type Presence = { onlineCount: number; onlineUserIds: string[] };

type SocketState = {
  connected: boolean;
  presence: Presence;
  subscribeToProject: (projectId: string) => () => void;
};

const SocketContext = createContext<SocketState | null>(null);

type FeedPages = InfiniteData<Paginated<Activity>> | undefined;

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, status } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Presence>({ onlineCount: 0, onlineUserIds: [] });

  const prependActivity = useCallback(
    (activity: Activity) => {
      queryClient.setQueriesData<FeedPages>({ queryKey: activityKeys.all }, (current) => {
        if (!current) return current;
        const alreadyThere = current.pages.some((page) =>
          page.items.some((item) => item.id === activity.id),
        );
        if (alreadyThere) return current;

        const [first, ...rest] = current.pages;
        if (!first) return current;

        return {
          ...current,
          pages: [{ ...first, items: [activity, ...first.items] }, ...rest],
        };
      });
    },
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

  // Project rooms are authorised server side; the ack tells us whether we are
  // actually in the room so the UI can stay honest about it.
  const subscribeToProject = useCallback((projectId: string) => {
    const socket = socketRef.current;
    if (!socket) return () => undefined;

    const join = () => socket.emit('project:subscribe', projectId);
    if (socket.connected) join();
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      if (socket.connected) socket.emit('project:unsubscribe', projectId);
    };
  }, []);

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
