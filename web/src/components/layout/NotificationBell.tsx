import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../hooks/queries';
import { relativeTime } from '../../lib/format';
import { Button } from '../ui/Button';

export const NotificationBell = () => {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.9 17.1a3 3 0 0 1-5.8 0m8.6-3.4V10a5.7 5.7 0 1 0-11.4 0v3.7L5 15.8v.9h14v-.9z"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <Button
              variant="ghost"
              size="sm"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">Nothing yet</p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.readAt) markRead.mutate(notification.id);
                    if (notification.taskId) {
                      setOpen(false);
                      navigate(`/tasks/${notification.taskId}`);
                    }
                  }}
                  className={clsx(
                    'flex w-full gap-2 px-3 py-2.5 text-left hover:bg-slate-50',
                    !notification.readAt && 'bg-indigo-50/50',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.readAt ? 'bg-transparent' : 'bg-indigo-600',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">{notification.body}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {relativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
