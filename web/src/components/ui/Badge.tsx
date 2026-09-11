import clsx from 'clsx';
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from '../../lib/format';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../../types';

const base =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap';

export const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={clsx(base, className ?? 'bg-slate-100 text-slate-700 ring-slate-200')}>
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <Badge className={PRIORITY_STYLES[priority]}>{PRIORITY_LABELS[priority]}</Badge>
);

export const OverdueBadge = () => (
  <Badge className="bg-rose-600 text-white ring-rose-600">Overdue</Badge>
);

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge
    className={clsx(
      status === 'ACTIVE' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      status === 'ON_HOLD' && 'bg-amber-50 text-amber-700 ring-amber-200',
      status === 'COMPLETED' && 'bg-slate-100 text-slate-600 ring-slate-200',
    )}
  >
    {PROJECT_STATUS_LABELS[status]}
  </Badge>
);
