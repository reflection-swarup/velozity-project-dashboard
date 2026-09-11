import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useActivityFeed, useMarkCaughtUp, useMissedActivity } from '../hooks/queries';
import { relativeTime } from '../lib/format';
import { Button } from './ui/Button';
import { Card, CardHeader } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { EmptyState, ErrorState, ListSkeleton, Spinner } from './ui/Feedback';
import { useSocket, type SubscriptionState } from '../realtime/SocketProvider';
import { useAuth } from '../auth/AuthProvider';
import type { Activity, ActivityType } from '../types';

const TYPE_TONE: Record<ActivityType, string> = {
  PROJECT_CREATED: 'bg-accent',
  TASK_CREATED: 'bg-info',
  TASK_STATUS_CHANGED: 'bg-success',
  TASK_ASSIGNED: 'bg-accent',
  TASK_UPDATED: 'bg-line-strong',
  TASK_OVERDUE: 'bg-danger',
  TASK_DELETED: 'bg-subtle',
};

// The server ships the sentence already formatted, so the client only appends
// the relative time. That keeps the socket event and the REST catch-up
// identical on screen.
const ActivityRow = ({
  activity,
  showProject,
  isNew,
}: {
  activity: Activity;
  showProject: boolean;
  isNew: boolean;
}) => (
  <li
    className={clsx(
      'relative flex gap-3 px-4 py-3',
      isNew && 'animate-rise bg-accent-soft/30',
    )}
  >
    <span className="relative flex flex-col items-center">
      {activity.actorId ? (
        <Avatar name={activity.actorName} className="size-7 text-[10px]" />
      ) : (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted">
          SYS
        </span>
      )}
      <span
        className={clsx(
          'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface',
          TYPE_TONE[activity.type],
        )}
      />
    </span>

    <div className="min-w-0 flex-1">
      <p className="text-md leading-snug font-medium text-ink">{activity.message}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-subtle">
        <span>{relativeTime(activity.createdAt)}</span>
        {showProject && activity.projectName ? (
          <>
            <span>·</span>
            <span className="truncate">{activity.projectName}</span>
          </>
        ) : null}
      </p>
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
    <div className="animate-fade border-b border-line bg-warn-soft px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-md font-semibold text-ink">
            {items.length} update{items.length === 1 ? '' : 's'} while you were away
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Replayed from the database, last seen {relativeTime(missed.data?.since ?? '')}
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
        {items.slice(0, 4).map((activity) => (
          <li key={activity.id} className="truncate text-xs text-muted">
            {activity.message}
          </li>
        ))}
        {items.length > 4 ? (
          <li className="text-xs text-subtle">and {items.length - 4} more in the feed below</li>
        ) : null}
      </ul>
    </div>
  );
};

const LiveIndicator = ({
  connected,
  scoped,
}: {
  connected: boolean;
  scoped: boolean;
}) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-xs font-medium text-muted"
    title={
      connected
        ? scoped
          ? 'Live, limited to activity on tasks assigned to you'
          : 'Receiving live updates for this project'
        : 'Reconnecting to live updates'
    }
  >
    <span className={clsx('size-1.5 rounded-full', connected ? 'bg-success' : 'bg-warn')} />
    {connected ? (scoped ? 'Live · your tasks' : 'Live') : 'Reconnecting'}
  </span>
);

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
  const { user } = useAuth();
  const [firstSeenId, setFirstSeenId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState>('pending');

  // Joining the project room is what makes this live for everyone currently
  // looking at the same project. The server acknowledges whether we are in, and
  // a refusal is reported rather than assumed to be a failure.
  useEffect(() => {
    if (!projectId) return;
    return subscribeToProject(projectId, setSubscription);
  }, [projectId, subscribeToProject]);

  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  // A refused project room is the expected outcome for a developer, so the
  // label narrows instead of claiming the feed is broken.
  const scopedToOwnTasks =
    Boolean(projectId) && subscription === 'refused' && user?.role === 'DEVELOPER';

  useEffect(() => {
    if (firstSeenId === null && items.length > 0) setFirstSeenId(items[0]!.id);
  }, [items, firstSeenId]);

  const newestIndex = firstSeenId ? items.findIndex((item) => item.id === firstSeenId) : -1;

  return (
    <Card className={clsx('overflow-hidden', className)}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={<LiveIndicator connected={connected} scoped={scopedToOwnTasks} />}
      />

      {showMissed ? <MissedBanner /> : null}

      {feed.isPending ? <ListSkeleton rows={5} /> : null}
      {feed.isError ? <ErrorState error={feed.error} /> : null}

      {feed.isSuccess && items.length === 0 ? (
        <EmptyState title="No activity yet" hint="Changes appear here the moment they happen" />
      ) : null}

      <ul className="divide-y divide-line">
        {items.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            showProject={!projectId}
            isNew={newestIndex > 0 && index < newestIndex}
          />
        ))}
      </ul>

      {feed.hasNextPage ? (
        <div className="border-t border-line px-4 py-3">
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
