import clsx from 'clsx';
import {
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
} from '../../lib/format';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../../types';

const base =
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap';

export const Badge = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <span className={clsx(base, className ?? 'bg-raised text-muted')}>{children}</span>
);

const DOT = 'size-1.5 rounded-full';

const STATUS_TONE: Record<TaskStatus, { pill: string; dot: string }> = {
  TODO: { pill: 'bg-raised text-muted', dot: 'bg-subtle' },
  IN_PROGRESS: { pill: 'bg-info-soft text-info', dot: 'bg-info' },
  IN_REVIEW: { pill: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  DONE: { pill: 'bg-success-soft text-success', dot: 'bg-success' },
};

export const StatusBadge = ({ status }: { status: TaskStatus }) => (
  <span className={clsx(base, STATUS_TONE[status].pill)}>
    <span className={clsx(DOT, STATUS_TONE[status].dot)} />
    {STATUS_LABELS[status]}
  </span>
);

const PRIORITY_TONE: Record<TaskPriority, string> = {
  LOW: 'bg-raised text-muted',
  MEDIUM: 'bg-info-soft text-info',
  HIGH: 'bg-warn-soft text-warn',
  CRITICAL: 'bg-danger-soft text-danger',
};

export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <span className={clsx(base, PRIORITY_TONE[priority])}>{PRIORITY_LABELS[priority]}</span>
);

export const OverdueBadge = () => (
  <span className={clsx(base, 'bg-danger text-white')}>Overdue</span>
);

const PROJECT_TONE: Record<ProjectStatus, { pill: string; dot: string }> = {
  ACTIVE: { pill: 'bg-success-soft text-success', dot: 'bg-success' },
  ON_HOLD: { pill: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  COMPLETED: { pill: 'bg-raised text-muted', dot: 'bg-subtle' },
};

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <span className={clsx(base, PROJECT_TONE[status].pill)}>
    <span className={clsx(DOT, PROJECT_TONE[status].dot)} />
    {PROJECT_STATUS_LABELS[status]}
  </span>
);

export const CountBadge = ({ count, tone = 'accent' }: { count: number; tone?: 'accent' | 'danger' }) => {
  if (count <= 0) return null;
  return (
    <span
      className={clsx(
        'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        tone === 'danger' ? 'bg-danger text-white' : 'bg-accent text-accent-ink',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
