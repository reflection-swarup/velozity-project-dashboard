import { Link } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed';
import { TaskList } from '../components/TaskList';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/Feedback';
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
            <span className="text-muted">{STATUS_LABELS[status]}</span>
            <span className="font-medium text-ink tabular-nums">{counts[status]}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-accent"
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
      <div key={priority} className="rounded-lg bg-raised px-3 py-2">
        <p className="text-xs text-muted">{PRIORITY_LABELS[priority]}</p>
        <p className="text-lg font-semibold text-ink tabular-nums">{counts[priority]}</p>
      </div>
    ))}
  </div>
);

const AdminView = ({ data }: { data: AdminDashboard }) => {
  const { presence } = useSocket();

  return (
    <div>
      <Section title="At a glance" description="Every project across the agency">
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
      </Section>

      <Section title="Breakdown" description="Where the work currently sits">
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
            <Link className="block text-accent hover:underline" to="/tasks?overdue=true">
              Overdue tasks ({data.overdueCount})
            </Link>
            <Link
              className="block text-accent hover:underline"
              to="/tasks?status=IN_REVIEW&sort=dueDate&order=asc"
            >
              Waiting on review
            </Link>
            <Link
              className="block text-accent hover:underline"
              to="/tasks?priority=CRITICAL&status=TODO,IN_PROGRESS"
            >
              Critical and not done
            </Link>
            <Link className="block text-accent hover:underline" to="/users">
              Manage team
            </Link>
          </div>
        </Card>
        </div>
      </Section>

      <Section title="Activity" description="Every project, updating live">
        <ActivityFeed title="Global activity" showMissed />
      </Section>
    </div>
  );
};

const ManagerView = ({ data }: { data: ManagerDashboard }) => (
  <div>
    <Section title="At a glance" description="Limited to the projects you manage">
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
    </Section>

    <Section title="Projects" description="Progress on each of your projects">
      <div className="grid gap-4 lg:grid-cols-3">
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader title="My projects" subtitle="Only projects you manage" />
        {data.projects.length === 0 ? (
          <EmptyState title="No projects yet" hint="Create one from the Projects tab" />
        ) : (
          <ul className="divide-y divide-line">
            {data.projects.map((project) => (
              <li key={project.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-sm font-medium text-ink hover:text-accent"
                  >
                    {project.name}
                  </Link>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted">{project.client.name}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
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
    </Section>

    <Section title="Schedule" description="Due in the next seven days, soonest first">
      <Card className="overflow-hidden">
        {data.upcomingThisWeek.length === 0 ? (
          <EmptyState
            title="Nothing due in the next seven days"
            hint="Upcoming work will appear here as due dates approach"
          />
        ) : (
          <TaskList tasks={data.upcomingThisWeek} />
        )}
      </Card>
    </Section>

    <Section title="Activity" description="Only from the projects you manage">
      <ActivityFeed title="Team activity" showMissed />
    </Section>
  </div>
);

const DeveloperView = ({ data }: { data: DeveloperDashboard }) => (
  <div>
    <Section title="At a glance" description="Only the work assigned to you">
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
    </Section>

    <Section title="My tasks" description="Highest priority first, then earliest due date">
      <Card className="overflow-hidden">
        {data.tasks.length === 0 ? (
          <EmptyState
            title="Nothing assigned to you yet"
            hint="A project manager will assign work to you here"
          />
        ) : (
          <TaskList tasks={data.tasks} showProject />
        )}
      </Card>
    </Section>

    <Section title="Activity" description="Only events on tasks assigned to you">
      <ActivityFeed title="My activity" showMissed />
    </Section>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const { data, isPending, isError, error } = useDashboard();

  if (isPending) return <CardSkeleton count={5} />;
  if (isError) return <ErrorState error={error} />;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0] ?? ''}`}
        description={
          data.role === 'ADMIN'
            ? 'Everything across the agency, updating live'
            : data.role === 'PROJECT_MANAGER'
              ? 'Your projects and your team'
              : 'Your assigned work, highest priority first'
        }
        breadcrumbs={[{ label: 'Home' }, { label: 'Overview' }]}
      />

      {data.role === 'ADMIN' ? <AdminView data={data} /> : null}
      {data.role === 'PROJECT_MANAGER' ? <ManagerView data={data} /> : null}
      {data.role === 'DEVELOPER' ? <DeveloperView data={data} /> : null}
    </div>
  );
};
