import { Link } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskList } from '../components/TaskList';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { EmptyState, ErrorState, Loading } from '../components/ui/Feedback';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { useDashboard } from '../hooks/queries';
import { useSocket } from '../realtime/SocketProvider';
import { useAuth } from '../auth/AuthProvider';
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from '../lib/format';
import type {
  AdminDashboard,
  DeveloperDashboard,
  ManagerDashboard,
  PriorityCounts,
  StatusCounts,
} from '../types';

const StatusBreakdown = ({ counts }: { counts: StatusCounts }) => {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;

  return (
    <div className="space-y-2 px-4 py-3">
      {STATUS_ORDER.map((status) => (
        <div key={status}>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">{STATUS_LABELS[status]}</span>
            <span className="font-medium text-slate-900 tabular-nums">{counts[status]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const PriorityBreakdown = ({ counts }: { counts: PriorityCounts }) => (
  <div className="grid grid-cols-2 gap-3 px-4 py-3">
    {PRIORITY_ORDER.map((priority) => (
      <div key={priority} className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-500">{PRIORITY_LABELS[priority]}</p>
        <p className="text-lg font-semibold text-slate-900 tabular-nums">{counts[priority]}</p>
      </div>
    ))}
  </div>
);

const AdminView = ({ data }: { data: AdminDashboard }) => {
  const { presence } = useSocket();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Projects" value={data.projectTotal} />
        <StatCard label="Tasks" value={data.taskTotal} />
        <StatCard
          label="Overdue"
          value={data.overdueCount}
          tone={data.overdueCount > 0 ? 'danger' : 'default'}
          hint="Flagged by the scheduler"
        />
        <StatCard
          label="Online now"
          value={presence.onlineCount || data.onlineCount}
          tone="success"
          hint="Live WebSocket presence"
        />
        <StatCard label="Team" value={data.userTotal} hint={`${data.clientTotal} clients`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader title="Tasks by status" subtitle="Across every project" />
          <StatusBreakdown counts={data.tasksByStatus} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Tasks by priority" />
          <PriorityBreakdown counts={data.tasksByPriority} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Quick links" />
          <div className="space-y-1 px-4 py-3 text-sm">
            <Link className="block text-indigo-600 hover:underline" to="/tasks?overdue=true">
              Overdue tasks ({data.overdueCount})
            </Link>
            <Link
              className="block text-indigo-600 hover:underline"
              to="/tasks?status=IN_REVIEW&sort=dueDate&order=asc"
            >
              Waiting on review
            </Link>
            <Link
              className="block text-indigo-600 hover:underline"
              to="/tasks?priority=CRITICAL&status=TODO,IN_PROGRESS"
            >
              Critical and not done
            </Link>
            <Link className="block text-indigo-600 hover:underline" to="/users">
              Manage team
            </Link>
          </div>
        </Card>
      </div>

      <ActivityFeed
        title="Global activity"
        subtitle="Every project, updating live"
        showMissed
      />
    </div>
  );
};

const ManagerView = ({ data }: { data: ManagerDashboard }) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="My projects" value={data.projectTotal} />
      <StatCard label="Tasks" value={data.taskTotal} />
      <StatCard
        label="Overdue"
        value={data.overdueCount}
        tone={data.overdueCount > 0 ? 'danger' : 'default'}
      />
      <StatCard label="Due this week" value={data.upcomingThisWeek.length} />
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader title="My projects" subtitle="Only projects you manage" />
        {data.projects.length === 0 ? (
          <EmptyState title="No projects yet" hint="Create one from the Projects tab" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.projects.map((project) => (
              <li key={project.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-indigo-700"
                  >
                    {project.name}
                  </Link>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{project.client.name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  {STATUS_ORDER.map((status) => (
                    <span key={status}>
                      {STATUS_LABELS[status]}:{' '}
                      <span className="font-medium tabular-nums">{project.taskCounts[status]}</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Tasks by priority" subtitle="Your projects only" />
        <PriorityBreakdown counts={data.tasksByPriority} />
      </Card>
    </div>

    <Card className="overflow-hidden">
      <CardHeader title="Due this week" subtitle="Soonest first, then priority" />
      {data.upcomingThisWeek.length === 0 ? (
        <EmptyState title="Nothing due in the next seven days" />
      ) : (
        <TaskList tasks={data.upcomingThisWeek} />
      )}
    </Card>

    <ActivityFeed title="Team activity" subtitle="Activity from your projects" showMissed />
  </div>
);

const DeveloperView = ({ data }: { data: DeveloperDashboard }) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="My tasks" value={data.taskTotal} />
      <StatCard label="In progress" value={data.tasksByStatus.IN_PROGRESS} />
      <StatCard label="In review" value={data.tasksByStatus.IN_REVIEW} />
      <StatCard
        label="Overdue"
        value={data.overdueCount}
        tone={data.overdueCount > 0 ? 'danger' : 'default'}
      />
    </div>

    <Card className="overflow-hidden">
      <CardHeader title="My tasks" subtitle="Sorted by priority, then due date" />
      {data.tasks.length === 0 ? (
        <EmptyState title="Nothing assigned to you yet" />
      ) : (
        <TaskList tasks={data.tasks} />
      )}
    </Card>

    <ActivityFeed title="My activity" subtitle="Updates on tasks assigned to you" showMissed />
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isPending, isError, error } = useDashboard();

  if (isPending) return <Loading label="Loading dashboard" />;
  if (isError) return <ErrorState error={error} />;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="text-sm text-slate-500">
          {data.role === 'ADMIN'
            ? 'Everything across the agency'
            : data.role === 'PROJECT_MANAGER'
              ? 'Your projects and your team'
              : 'Your assigned work'}
        </p>
      </div>

      {data.role === 'ADMIN' ? <AdminView data={data} /> : null}
      {data.role === 'PROJECT_MANAGER' ? <ManagerView data={data} /> : null}
      {data.role === 'DEVELOPER' ? <DeveloperView data={data} /> : null}
    </div>
  );
};
