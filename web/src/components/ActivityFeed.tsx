import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useActivityFeed, useMarkCaughtUp, useMissedActivity } from '../hooks/queries';
import { relativeTime } from '../lib/format';
import { Button } from './ui/Button';
import { Card, CardHeader } from './ui/Card';
import { EmptyState, ErrorState, Loading, Spinner } from './ui/Feedback';
import { useSocket } from '../realtime/SocketProvider';
import type { Activity, ActivityType } from '../types';

const DOT_STYLES: Record<ActivityType, string> = {
  PROJECT_CREATED: 'bg-indigo-500',
  TASK_CREATED: 'bg-sky-500',
  TASK_STATUS_CHANGED: 'bg-emerald-500',
  TASK_ASSIGNED: 'bg-violet-500',
  TASK_UPDATED: 'bg-slate-400',
  TASK_OVERDUE: 'bg-rose-500',
  TASK_DELETED: 'bg-slate-500',
};

// The server sends the sentence already formatted; the client only ever adds
// the relative timestamp so the socket event and the REST catch-up read alike.
const ActivityRow = ({ activity, showProject }: { activity: Activity; showProject: boolean }) => (
  <li className="flex gap-3 px-4 py-2.5">
    <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', DOT_STYLES[activity.type])} />
    <div className="min-w-0">
      <p className="text-sm text-slate-800">
        {activity.message}
        <span className="text-slate-400"> · {relativeTime(activity.createdAt)}</span>
      </p>
      {showProject && activity.projectName ? (
        <p className="mt-0.5 text-xs text-slate-500">{activity.projectName}</p>
      ) : null}
    </div>
  </li>
);

const MissedBanner = () => {
  const missed = useMissedActivity();
  const caughtUp = useMarkCaughtUp();
  const [dismissed, setDismissed] = useState(false);

  const items = missed.data?.items ?? [];
  if (dismissed || items.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-amber-900">
            {items.length} update{items.length === 1 ? '' : 's'} while you were away
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Loaded from the database since {relativeTime(missed.data?.since ?? '')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            caughtUp.mutate();
            setDismissed(true);
          }}
        >
          Caught up
        </Button>
      </div>
      <ul className="mt-2 space-y-1">
        {items.slice(0, 5).map((activity) => (
          <li key={activity.id} className="text-xs text-amber-800">
            {activity.message}
            <span className="text-amber-600"> · {relativeTime(activity.createdAt)}</span>
          </li>
        ))}
        {items.length > 5 ? (
          <li className="text-xs text-amber-600">and {items.length - 5} more below</li>
        ) : null}
      </ul>
    </div>
  );
};

type Props = {
  projectId?: string;
  title?: string;
  subtitle?: string;
  showMissed?: boolean;
  className?: string;
};

export const ActivityFeed = ({
  projectId,
  title = 'Activity feed',
  subtitle,
  showMissed = false,
  className,
}: Props) => {
  const feed = useActivityFeed(projectId);
  const { connected, subscribeToProject } = useSocket();

  // Joining the project room is what turns this into a live view for everyone
  // currently looking at the same project.
  useEffect(() => {
    if (!projectId) return;
    return subscribeToProject(projectId);
  }, [projectId, subscribeToProject]);

  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span
              className={clsx('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-500')}
            />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        }
      />

      {showMissed ? <MissedBanner /> : null}

      {feed.isPending ? <Loading label="Loading activity" /> : null}
      {feed.isError ? <ErrorState error={feed.error} /> : null}

      {feed.isSuccess && items.length === 0 ? (
        <EmptyState title="No activity yet" hint="Changes will appear here as they happen" />
      ) : null}

      <ul className="divide-y divide-slate-100">
        {items.map((activity) => (
          <ActivityRow key={activity.id} activity={activity} showProject={!projectId} />
        ))}
      </ul>

      {feed.hasNextPage ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? <Spinner /> : null}
            Load older activity
          </Button>
        </div>
      ) : null}
    </Card>
  );
};
