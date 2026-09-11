import type { Role, TaskPriority, TaskStatus, ProjectStatus } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_ORDER: TaskPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  DEVELOPER: 'Developer',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
};

export const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700 ring-slate-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 ring-sky-200',
  IN_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 ring-blue-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const UNITS: [limit: number, seconds: number, label: string][] = [
  [60, 1, 'sec'],
  [3600, 60, 'min'],
  [86400, 3600, 'hour'],
  [604800, 86400, 'day'],
  [2629800, 604800, 'week'],
  [31557600, 2629800, 'month'],
];

export const relativeTime = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';

  for (const [limit, divisor, label] of UNITS) {
    if (seconds < limit) {
      const value = Math.round(seconds / divisor);
      return `${value} ${label}${value === 1 ? '' : 's'} ago`;
    }
  }

  const years = Math.round(seconds / 31557600);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

export const formatDate = (iso: string | null) => {
  if (!iso) return 'No due date';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const dueLabel = (task: { dueDate: string | null; isOverdue: boolean }) => {
  if (!task.dueDate) return 'No due date';
  if (task.isOverdue) return `Overdue · ${formatDate(task.dueDate)}`;

  const days = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${formatDate(task.dueDate)}`;
};

export const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
