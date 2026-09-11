import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { FormError, Spinner } from '../components/ui/Feedback';

const DEMO_ACCOUNTS = [
  { email: 'admin@velozity.test', role: 'Admin' },
  { email: 'ravi@velozity.test', role: 'Project Manager' },
  { email: 'karan@velozity.test', role: 'Developer' },
];

export const LoginPage = () => {
  const { login, status } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('admin@velozity.test');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
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
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            V
          </span>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Velozity Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your agency workspace</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-slate-200">
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

        <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-600">Seeded accounts</p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-slate-50"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('Password123!');
                  }}
                >
                  <span className="text-slate-700">{account.email}</span>
                  <span className="text-slate-400">{account.role}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-2 text-xs text-slate-400">Password for all: Password123!</p>
        </div>
      </div>
    </div>
  );
};
