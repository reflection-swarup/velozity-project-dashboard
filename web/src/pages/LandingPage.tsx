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
    title: 'Role-based access',
    body: 'Permissions are enforced on the server, inside the query itself. A request cannot return work that belongs to someone else, whatever the client asks for.',
  },
  {
    icon: IconActivity,
    title: 'Role-filtered live feed',
    body: 'Admins see every project, managers see their own, developers see only their own tasks. The filtering happens before an event leaves the server.',
  },
  {
    icon: IconDatabase,
    title: 'History that is recorded, not guessed',
    body: 'Every status change is stored with who made it and when, so the trail stays accurate even after a task is renamed or handed over.',
  },
  {
    icon: IconBell,
    title: 'Notifications without polling',
    body: 'Assignment and review alerts arrive the moment they happen, and the unread badge updates itself. Nothing in the app sits on a timer.',
  },
  {
    icon: IconAlert,
    title: 'Overdue work flagged for you',
    body: 'A scheduled job marks work that slipped past its due date and posts it to the feed. Nothing is calculated when a page loads.',
  },
  {
    icon: IconUsers,
    title: 'Presence and catch-up',
    body: 'See who is online right now, and come back after a break to the updates you missed while you were away.',
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
    points: [
      'Create projects and assign tasks',
      'Cannot see another manager’s work',
      'Notified when work hits review',
    ],
  },
  {
    name: 'Developer',
    email: 'karan@velozity.test',
    summary: 'Only the work assigned to them',
    points: [
      'Sees only their own tasks',
      'Can change status, nothing else',
      'Never receives another developer’s events',
    ],
  },
];

const METRICS = [
  ['3', 'roles with separate access'],
  ['0', 'client polling intervals'],
  ['20', 'missed events replayed'],
  ['∞', 'live activity events'],
];

const STACK = [
  'React',
  'TypeScript',
  'Node',
  'Express',
  'PostgreSQL',
  'Prisma',
  'Socket.io',
  'Tailwind',
  'Docker',
];

const REPO_URL = 'https://github.com/reflection-swarup/velozity-project-dashboard';

export const LandingPage = () => {
  const { status, user, login, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();

  // The role cards are the demo entry point, so the evaluator never has to copy
  // a credential. The seeded password stays documented in the README.
  const continueAs = async (email: string) => {
    try {
      await login(email, 'Password123!');
      navigate('/dashboard');
    } catch {
      navigate('/login', { state: { email } });
    }
  };

  return (
    <div className="flex min-h-full flex-col">
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
            {status === 'authenticated' && user ? (
              <>
                <span className="hidden text-[13px] text-muted lg:inline">
                  Signed in as <span className="font-semibold text-ink">{user.name}</span>
                </span>
                <Link to="/dashboard">
                  <Button size="sm">Open dashboard</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => void logout()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="sm" variant="ghost">
                    Request access
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="sm">Sign in</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <div className="animate-rise max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            Real-time · Role-based · PostgreSQL
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-[3.25rem] sm:leading-[1.08]">
            A real-time project dashboard built for modern teams.
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-muted">
            Manage client projects, track tasks through review, and see team activity as it happens
            — with role-based access enforced at the API.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to={status === 'authenticated' ? '/dashboard' : '/login'}>
              <Button>
                {status === 'authenticated' ? 'Open the dashboard' : 'Sign in to the dashboard'}
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#roles">
              <Button variant="secondary">Compare roles</Button>
            </a>
          </div>

          <p className="mt-4 text-[13px] text-subtle">
            New to the team?{' '}
            <Link to="/signup" className="font-semibold text-accent hover:underline">
              Request access
            </Link>{' '}
            and a manager or administrator grants your role. Or continue as any of the three roles
            below to look around.
          </p>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-4">
          {METRICS.map(([value, label]) => (
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
            The same endpoints return different data for each role, and refuse outright when they
            should. Continue as any of them to see where the boundaries sit — an administrator
            creates real accounts from the Team page.
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
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                      {point}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 font-mono text-xs text-subtle">{role.email}</p>
                <Button className="mt-2.5" onClick={() => void continueAs(role.email)}>
                  Continue as {role.name}
                  <IconArrowRight className="size-4" />
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
            The parts that were interesting to build.
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
            <Link to={status === 'authenticated' ? '/dashboard' : '/login'}>
              <Button>
                Open the dashboard
                <IconArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <p className="text-md font-medium text-muted">
            Velozity Dashboard <span className="text-subtle">·</span> Real-time project management
          </p>
          <div className="flex items-center gap-4 text-[13px] text-subtle">
            <span>Technical Assessment Demo · 2026</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium transition-colors hover:text-ink"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
