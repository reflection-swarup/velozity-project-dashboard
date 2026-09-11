import { useState } from 'react';
import { useCreateUser, useUpdateUser, useUsers } from '../hooks/queries';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ErrorState, FormError, Loading } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { ROLE_LABELS, relativeTime } from '../lib/format';
import type { Role } from '../types';

const NewUserDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEVELOPER' as Role,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      { ...form, email: form.email.trim().toLowerCase(), name: form.name.trim() },
      {
        onSuccess: () => {
          setForm({ name: '', email: '', password: '', role: 'DEVELOPER' });
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title="Add team member"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creating' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-3">
        <FormError error={createUser.error} />

        <Field label="Name" htmlFor="user-name">
          <Input
            id="user-name"
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field label="Email" htmlFor="user-email">
          <Input
            id="user-email"
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>

        <Field label="Temporary password" htmlFor="user-password">
          <Input
            id="user-password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </Field>

        <Field label="Role" htmlFor="user-role">
          <Select
            id="user-role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
          >
            <option value="DEVELOPER">Developer</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
};

export const UsersPage = () => {
  const users = useUsers();
  const updateUser = useUpdateUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">
            Changing a role or deactivating a user revokes their refresh tokens immediately
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Add member</Button>
      </div>

      {users.isPending ? <Loading label="Loading team" /> : null}
      {users.isError ? <ErrorState error={users.error} /> : null}

      {users.isSuccess ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {users.data.items.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar name={member.name} online={member.isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {member.name}
                    {member.isActive ? null : (
                      <span className="ml-2 text-xs font-normal text-slate-400">deactivated</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>

                <Badge>{ROLE_LABELS[member.role]}</Badge>

                <span className="w-28 text-xs text-slate-500">
                  {member.isOnline ? 'Online now' : `Seen ${relativeTime(member.lastSeenAt)}`}
                </span>

                <Select
                  aria-label={`Role for ${member.name}`}
                  className="w-44 py-1 text-xs"
                  value={member.role}
                  disabled={updateUser.isPending}
                  onChange={(event) =>
                    updateUser.mutate({ id: member.id, role: event.target.value as Role })
                  }
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>

                <Button
                  variant={member.isActive ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={updateUser.isPending}
                  onClick={() => updateUser.mutate({ id: member.id, isActive: !member.isActive })}
                >
                  {member.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <NewUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
