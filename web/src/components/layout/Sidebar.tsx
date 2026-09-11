import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../../auth/AuthProvider';
import { useAccessRequests, useNotifications, useProjects, useTasks } from '../../hooks/queries';
import { PROJECT_STATUS_LABELS, ROLE_LABELS } from '../../lib/format';
import { CountBadge } from '../ui/Badge';
import { Logo } from '../ui/Logo';
import {
  IconActivity,
  IconBriefcase,
  IconCheck,
  IconClose,
  IconFolder,
  IconHome,
  IconShield,
  IconUsers,
} from '../ui/Icon';
import type { ProjectStatus, Role } from '../../types';

type Item = {
  to: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  roles: Role[];
  badge?: number;
  badgeTone?: 'accent' | 'danger';
};

// The dot carries the project status and nothing else. Overdue work gets its
// own count badge, so one indicator never has to mean two different things.
const STATUS_DOT: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-success',
  ON_HOLD: 'bg-warn',
  COMPLETED: 'bg-line-strong',
};

// Each role gets its own tint, so with several windows open side by side it is
// obvious at a glance which one you are looking at.
const ROLE_TONE: Record<Role, string> = {
  ADMIN: 'bg-accent-soft text-accent',
  PROJECT_MANAGER: 'bg-info-soft text-info',
  DEVELOPER: 'bg-success-soft text-success',
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-md transition-colors duration-150',
    isActive
      ? 'bg-accent-soft font-semibold text-accent'
      : 'font-medium text-ink hover:bg-raised',
  );

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-6 mb-2 px-3 text-xs font-bold tracking-widest text-muted uppercase">
    {children}
  </p>
);

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user } = useAuth();
  const projects = useProjects();
  const notifications = useNotifications();
  const myOpenTasks = useTasks('status=TODO,IN_PROGRESS,IN_REVIEW&limit=1');
  const canReview = user?.role === 'ADMIN';
  const accessRequests = useAccessRequests('PENDING', canReview);

  if (!user) return null;

  const primary: Item[] = [
    {
      to: '/tasks',
      label: user.role === 'DEVELOPER' ? 'My Tasks' : 'Tasks',
      icon: IconCheck,
      roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'],
      badge: myOpenTasks.data?.total ?? 0,
    },
    {
      to: '/activity',
      label: 'Activity',
      icon: IconActivity,
      roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'],
      badge: notifications.data?.unreadCount ?? 0,
      badgeTone: 'danger',
    },
  ];

  const menu: Item[] = [
    {
      to: '/dashboard',
      label: 'Overview',
      icon: IconHome,
      roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'],
    },
    {
      to: '/projects',
      label: 'Projects',
      icon: IconFolder,
      roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'],
    },
    { to: '/clients', label: 'Clients', icon: IconBriefcase, roles: ['ADMIN'] },
    { to: '/users', label: 'Team', icon: IconUsers, roles: ['ADMIN'] },
    {
      to: '/requests',
      label: 'Access requests',
      icon: IconShield,
      roles: ['ADMIN'],
      badge: accessRequests.data?.pendingCount ?? 0,
      badgeTone: 'danger',
    },
  ];

  const recent = (projects.data?.items ?? []).slice(0, 4);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <div className="min-w-0 flex-1">
          <Logo className="h-9" />
          <span
            className={clsx(
              'mt-2.5 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-md font-bold',
              ROLE_TONE[user.role],
            )}
          >
            <span className="size-2 rounded-full bg-current opacity-70" />
            {ROLE_LABELS[user.role]} workspace
          </span>
        </div>
        {onNavigate ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-md p-1.5 text-muted hover:bg-raised lg:hidden"
            aria-label="Close navigation"
          >
            <IconClose className="size-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-6">
        <div className="mt-4 space-y-1">
          {primary
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={onNavigate}>
                <item.icon className="size-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <CountBadge count={item.badge ?? 0} tone={item.badgeTone} />
              </NavLink>
            ))}
        </div>

        <SectionLabel>Menu</SectionLabel>
        <div className="space-y-1">
          {menu
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={onNavigate}>
                <item.icon className="size-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <CountBadge count={item.badge ?? 0} tone={item.badgeTone} />
              </NavLink>
            ))}
        </div>

        {recent.length > 0 ? (
          <>
            <SectionLabel>Recent projects</SectionLabel>
            <div className="space-y-1">
              {recent.map((project) => (
                <NavLink
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className={linkClass}
                  onClick={onNavigate}
                >
                  <span
                    className={clsx('ml-1 size-2.5 shrink-0 rounded-full', STATUS_DOT[project.status])}
                    title={`${PROJECT_STATUS_LABELS[project.status]} project`}
                  />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.overdueCount > 0 ? (
                    <span
                      className="inline-flex min-w-5 items-center justify-center rounded-md bg-danger-soft px-1.5 py-0.5 text-xs font-bold text-danger tabular-nums"
                      title={`${project.overdueCount} overdue task${project.overdueCount === 1 ? '' : 's'}`}
                    >
                      {project.overdueCount}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </>
        ) : null}
      </nav>
    </div>
  );
};
