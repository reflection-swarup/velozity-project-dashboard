import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequestAccess, useSignupOptions } from '../hooks/queries';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { FormError, Spinner } from '../components/ui/Feedback';
import { IconArrowRight, IconCheck } from '../components/ui/Icon';
import { Logo } from '../components/ui/Logo';
import type { RequestableRole } from '../types';

const ROLE_COPY: Record<RequestableRole, { label: string; blurb: string }> = {
  DEVELOPER: {
    label: 'Developer',
    blurb: 'Work on assigned tasks and move them through review.',
  },
  PROJECT_MANAGER: {
    label: 'Project Manager',
    blurb: 'Own projects, assign work and track your team.',
  },
};

export const SignupPage = () => {
  const options = useSignupOptions();
  const requestAccess = useRequestAccess();
  const [submitted, setSubmitted] = useState<{ name: string; reviewer: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    requestedRole: 'DEVELOPER' as RequestableRole,
    projectId: '',
    note: '',
  });

  const projects = options.data?.projects ?? [];
  const managers = options.data?.managers ?? [];

  // Picking a project decides the reviewer, because a developer joins under
  // that project's own manager.
  const impliedManager = useMemo(() => {
    const project = projects.find((entry) => entry.id === form.projectId);
    if (!project) return null;
    return managers.find((manager) => manager.id === project.managerId) ?? null;
  }, [projects, managers, form.projectId]);

  const passwordsMatch = form.password === form.confirm;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordsMatch) return;

    requestAccess.mutate(
      {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        requestedRole: form.requestedRole,
        ...(form.requestedRole === 'DEVELOPER' && form.projectId
          ? { projectId: form.projectId }
          : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      },
      {
        onSuccess: () =>
          setSubmitted({
            name: form.name.trim(),
            reviewer:
              form.requestedRole === 'DEVELOPER' && impliedManager
                ? impliedManager.name
                : 'an administrator',
          }),
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div className="animate-rise w-full max-w-md text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-success-soft text-success">
            <IconCheck className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Request sent</h1>
          <p className="mt-3 text-md text-muted">
            Thanks {submitted.name}. {submitted.reviewer} has been notified and will review your
            access. You will be able to sign in with the password you chose as soon as it is
            approved.
          </p>
          <p className="mt-4 rounded-lg bg-raised px-4 py-3 text-[13px] text-muted">
            No account exists yet. Roles are granted by a reviewer rather than chosen at signup, so
            nobody can give themselves access they should not have.
          </p>
          <Link to="/" className="mt-6 inline-block">
            <Button variant="secondary">Back to the overview</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="animate-rise w-full max-w-lg">
        <Link to="/" className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="h-11" />
          <span>
            <span className="block text-xl font-bold tracking-tight text-ink">Request access</span>
            <span className="mt-1 block text-md text-muted">
              Tell us who you are and where you fit, and a reviewer will grant your role
            </span>
          </span>
        </Link>

        <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface p-5 ring-1 ring-line">
          <FormError error={requestAccess.error} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="signup-name">
              <Input
                id="signup-name"
                required
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>

            <Field label="Work email" htmlFor="signup-email">
              <Input
                id="signup-email"
                type="email"
                required
                autoComplete="username"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>

            <Field label="Password" htmlFor="signup-password" hint="At least 8 characters">
              <Input
                id="signup-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </Field>

            <Field
              label="Confirm password"
              htmlFor="signup-confirm"
              error={form.confirm && !passwordsMatch ? 'Passwords do not match' : undefined}
            >
              <Input
                id="signup-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm}
                onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-[13px] font-semibold text-ink">
              What will you be doing?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(ROLE_COPY) as RequestableRole[]).map((role) => (
                <label
                  key={role}
                  className={
                    form.requestedRole === role
                      ? 'cursor-pointer rounded-lg bg-accent-soft p-3 ring-2 ring-accent'
                      : 'cursor-pointer rounded-lg bg-surface p-3 ring-1 ring-line hover:bg-raised'
                  }
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="requestedRole"
                      className="accent-accent"
                      checked={form.requestedRole === role}
                      onChange={() => setForm({ ...form, requestedRole: role, projectId: '' })}
                    />
                    <span className="text-md font-semibold text-ink">{ROLE_COPY[role].label}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">{ROLE_COPY[role].blurb}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.requestedRole === 'DEVELOPER' ? (
            <Field
              label="Which project are you joining?"
              htmlFor="signup-project"
              hint={
                impliedManager
                  ? `${impliedManager.name} manages this project and will review your request`
                  : 'Your request goes to whoever manages the project you pick'
              }
            >
              <Select
                id="signup-project"
                required
                disabled={options.isPending}
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              >
                <option value="">{options.isPending ? 'Loading projects' : 'Select a project'}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="rounded-lg bg-raised px-3 py-3 text-[13px] text-muted">
              Manager access is reviewed by an administrator, who assigns your projects once you
              are set up. Use the note below if there is a client or account you are joining for.
            </p>
          )}

          <Field
            label="Anything the reviewer should know?"
            htmlFor="signup-note"
            hint="Optional, up to 500 characters"
          >
            <Textarea
              id="signup-note"
              maxLength={500}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
            />
          </Field>

          <Button
            type="submit"
            className="w-full"
            disabled={requestAccess.isPending || !passwordsMatch}
          >
            {requestAccess.isPending ? <Spinner /> : null}
            Send request
            <IconArrowRight className="size-4" />
          </Button>

          <p className="text-center text-[13px] text-subtle">
            Requesting access does not create an account. A reviewer grants the role, so it cannot
            be self-assigned.
          </p>
        </form>

        <p className="mt-5 text-center text-md text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
