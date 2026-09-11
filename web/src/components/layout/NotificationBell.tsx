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
import { IconAlert, IconBell, IconCheck, IconClock } from '../ui/Icon';
import type { NotificationType } from '../../types';

const TYPE_ICON: Record<NotificationType, (props: { className?: string }) => React.ReactElement> = {
  TASK_ASSIGNED: IconCheck,
  TASK_IN_REVIEW: IconClock,
  TASK_OVERDUE: IconAlert,
};

const TYPE_TONE: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'bg-accent-soft text-accent',
  TASK_IN_REVIEW: 'bg-warn-soft text-warn',
  TASK_OVERDUE: 'bg-danger-soft text-danger',
};

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
        className="relative rounded-lg p-2 text-muted transition-colors duration-150 hover:bg-raised hover:text-ink"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
      >
        <IconBell className="size-5" />
        {unread > 0 ? (
          <span className="absolute top-0.5 right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-fade absolute right-0 z-40 mt-2 w-[22rem] overflow-hidden rounded-xl bg-surface shadow-xl ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <p className="text-md font-semibold text-ink">
              Notifications
              {unread > 0 ? <span className="ml-1.5 text-xs font-normal text-muted">{unread} unread</span> : null}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          </div>

          <div className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted">Nothing yet</p>
            ) : (
              items.map((notification) => {
                const Icon = TYPE_ICON[notification.type];
                return (
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
                      'flex w-full gap-2.5 px-3 py-3 text-left transition-colors duration-150 hover:bg-raised',
                      !notification.readAt && 'bg-accent-soft/40',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg',
                        TYPE_TONE[notification.type],
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink">
                        {notification.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">{notification.body}</span>
                      <span className="mt-1 block text-[11px] text-subtle">
                        {relativeTime(notification.createdAt)}
                      </span>
                    </span>
                    {!notification.readAt ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
