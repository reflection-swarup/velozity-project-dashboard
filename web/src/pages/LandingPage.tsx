import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import {
  IconActivity,
  IconAlert,
  IconArrowRight,
  IconBell,
  IconDatabase,
  IconMoon,
  IconShield,
  IconSun,
  IconUsers,
} from '../components/ui/Icon';

const FEATURES = [
  {
    icon: IconShield,
    title: 'Role-based access at the API',
    body: 'Every list query is built from a role scope in its WHERE clause, so a developer request cannot return another developer’s task. Roles are read from the database on each request, never trusted from the token.',
  },
  {
    icon: IconActivity,
    title: 'Role-filtered live feed',
    body: 'Socket.io rooms do the filtering. Admins join a global room, a manager joins only projects they own, and developers receive events on their own personal channel — so nothing leaks by design.',
  },
  {
    icon: IconDatabase,
    title: 'Activity log that is stored, not derived',
    body: 'Each status change writes an append-only row inside the same transaction, recording who changed what, when, and who owned the task at that moment.',
  },
  {
    icon: IconBell,
    title: 'Notifications without polling',
    body: 'Assignment and review notifications persist in Postgres and the unread badge updates over the socket. No interval timers anywhere in the client.',
  },
  {
    icon: IconAlert,
    title: 'Overdue flagged by a scheduler',
    body: 'A node-cron sweep flags past-due work every five minutes, writes a feed entry attributed to System and notifies the assignee. Nothing is computed on page load.',
  },
  {
    icon: IconUsers,
    title: 'Presence and offline catch-up',
    body: 'Live online counts come from socket presence, and reconnecting users read the events they missed back from the database using a persisted last-seen timestamp.',
  },
];

const ROLES = [
  {
    name: 'Admin',
    email: 'admin@velozity.test',
    summary: 'Everything across the agency',
    points: ['Manage clients, projects and users', 'Global activity feed', 'Live count of who is online'],
  },
  {
    name: 'Project Manager',
    email: 'ravi@velozity.test',
    summary: 'Their own projects only',
    points: ['Create projects and assign tasks', 'Cannot see another manager’s work', 'Notified when work hits review'],
  },
  {
    name: 'Developer',
    email: 'karan@velozity.test',
    summary: 'Only the work assigned to them',
    points: ['Sees only their own tasks', 'Can change status, nothing else', 'Never receives another developer’s events'],
  },
];

const STACK = [
  'React 19',
  'TypeScript',
  'Node + Express',
  'PostgreSQL',
  'Prisma',
  'Socket.io',
  'node-cron',
  'Zod',
  'Tailwind',
  'Docker',
];

export const LandingPage = () => {
  const { status, login } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();

  const signInAs = async (email: string) => {
    try {
      await login(email, 'Password123!');
      navigate('/dashboard');
    } catch {
      navigate('/login', { state: { email } });
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo className="h-9 sm:h-10" />
          <span className="hidden h-7 w-px bg-line sm:block" />
          <span className="hidden text-xl font-bold tracking-tight text-ink sm:block">
            Velozity Dashboard
          </span>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <a
              href="#roles"
              className="hidden rounded-lg px-3 py-2 text-md font-medium text-muted transition-colors hover:text-ink sm:block"
            >
              Roles
            </a>
            <a
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-md font-medium text-muted transition-colors hover:text-ink sm:block"
            >
              How it works
            </a>
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
              aria-label="Toggle theme"
            >
              {resolved === 'dark' ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
            </button>
            <Link to={status === 'authenticated' ? '/dashboard' : '/login'}>
              <Button size="sm">{status === 'authenticated' ? 'Open dashboard' : 'Sign in'}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <div className="animate-rise max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            Real-time · Role-based · Postgres
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-[3.25rem] sm:leading-[1.08]">
            The project dashboard a small agency actually runs on.
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-muted">
            Track client projects, move tasks through review, and watch your team work in real time.
            Three roles, each with strictly different access — enforced on the server, not hidden in
            the interface.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/login">
              <Button>
                Sign in to the demo
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#roles">
              <Button variant="secondary">Compare the three roles</Button>
            </a>
          </div>

          <p className="mt-4 text-[13px] text-subtle">
            Seeded with 7 users, 4 projects and 21 tasks. Password for every demo account is
            Password123!
          </p>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-4">
          {[
            ['3', 'roles with separate access'],
            ['0', 'polling intervals in the client'],
            ['1', 'append-only activity log'],
            ['20', 'missed events replayed on return'],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-3xl font-bold text-ink tabular-nums">{value}</dt>
              <dd className="mt-1 text-[13px] font-medium text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="roles" className="border-y border-line bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Three roles, three different applications
          </h2>
          <p className="mt-2.5 max-w-2xl text-md text-muted">
            Sign in as any of them to see how far the boundaries go. The same endpoint returns
            different data — and refuses outright when it should.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {ROLES.map((role) => (
              <div
                key={role.name}
                className="flex flex-col rounded-xl bg-canvas p-5 ring-1 ring-line transition-colors duration-150 hover:ring-line-strong"
              >
                <p className="text-lg font-bold text-ink">{role.name}</p>
                <p className="mt-1 text-[13px] font-medium text-muted">{role.summary}</p>

                <ul className="mt-4 flex-1 space-y-2">
                  {role.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-md text-muted">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 font-mono text-[13px] text-subtle">{role.email}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => void signInAs(role.email)}
                >
                  Sign in as {role.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-ink">How it works</h2>
          <p className="mt-2.5 max-w-2xl text-md text-muted">
            The parts that were interesting to build, and the decisions behind them.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl bg-surface p-5 ring-1 ring-line">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <feature.icon className="size-4.5" />
                </span>
                <p className="mt-4 text-md font-bold text-ink">{feature.title}</p>
                <p className="mt-2 text-md leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-md font-bold tracking-wider text-muted uppercase">Built with</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {STACK.map((item) => (
              <li
                key={item}
                className="rounded-lg bg-canvas px-3.5 py-2 text-md font-medium text-muted ring-1 ring-line"
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            <div>
              <p className="text-lg font-bold text-ink">Ready to look around?</p>
              <p className="mt-1 text-md text-muted">
                Open two windows as different roles to watch the feed update live.
              </p>
            </div>
            <Link to="/login">
              <Button>
                Sign in
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-[13px] text-subtle sm:px-6">
          <p>Velozity Dashboard — built for the Velozity Global Solutions technical assessment.</p>
          <a
            href="https://github.com/reflection-swarup/velozity-project-dashboard"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink"
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};
