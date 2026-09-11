import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { FormError, Spinner } from '../components/ui/Feedback';
import { IconArrowRight } from '../components/ui/Icon';

const DEMO_ACCOUNTS = [
  { email: 'admin@velozity.test', role: 'Admin', scope: 'Everything' },
  { email: 'ravi@velozity.test', role: 'Project Manager', scope: 'Own projects' },
  { email: 'karan@velozity.test', role: 'Developer', scope: 'Own tasks' },
];

export const LoginPage = () => {
  const { login, status } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('admin@velozity.test');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="animate-rise w-full max-w-sm">
        <Link to="/" className="mb-7 flex flex-col items-center gap-2.5 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-ink">
            V
          </span>
          <span>
            <span className="block text-lg font-semibold text-ink">Velozity Dashboard</span>
            <span className="block text-sm text-muted">Sign in to your agency workspace</span>
          </span>
        </Link>

        <form onSubmit={submit} className="space-y-3 rounded-xl bg-surface p-5 ring-1 ring-line">
          <FormError error={error} />

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            Sign in
          </Button>
        </form>

        <div className="mt-4 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-muted">
            Seeded accounts · password Password123!
          </p>
          <ul className="divide-y divide-line">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-raised"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('Password123!');
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ink">{account.email}</span>
                    <span className="block text-[11px] text-subtle">{account.scope}</span>
                  </span>
                  <span className="text-xs text-muted">{account.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          Read what this project does
          <IconArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
};
