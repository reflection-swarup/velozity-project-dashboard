import { useState } from 'react';
import { useClients, useCreateClient, useDeleteClient } from '../hooks/queries';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, FormError, Loading } from '../components/ui/Feedback';
import { Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../lib/format';

export const ClientsPage = () => {
  const clients = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', contactEmail: '' });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createClient.mutate(
      {
        name: form.name.trim(),
        company: form.company.trim(),
        contactEmail: form.contactEmail.trim().toLowerCase(),
      },
      {
        onSuccess: () => {
          setForm({ name: '', company: '', contactEmail: '' });
          setOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Every project belongs to a client, so a client cannot be removed while it still has projects"
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Clients' }]}
        actions={<Button onClick={() => setOpen(true)}>Add client</Button>}
      />

      {clients.isPending ? <Loading label="Loading clients" /> : null}
      {clients.isError ? <ErrorState error={clients.error} /> : null}
      {deleteClient.isError ? <ErrorState error={deleteClient.error} /> : null}

      {clients.isSuccess ? (
        <Card className="overflow-hidden">
          {clients.data.items.length === 0 ? (
            <EmptyState title="No clients yet" />
          ) : (
            <ul className="divide-y divide-line">
              {clients.data.items.map((client) => (
                <li key={client.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{client.name}</p>
                    <p className="text-xs text-muted">
                      {client.company} · {client.contactEmail}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {client._count?.projects ?? 0} project
                    {(client._count?.projects ?? 0) === 1 ? '' : 's'}
                  </span>
                  <span className="hidden text-xs text-subtle sm:block">
                    added {formatDate(client.createdAt)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={deleteClient.isPending}
                    onClick={() => {
                      if (!window.confirm(`Remove ${client.name}?`)) return;
                      deleteClient.mutate(client.id);
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <Modal
        open={open}
        title="Add client"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="client-form" disabled={createClient.isPending}>
              {createClient.isPending ? 'Saving' : 'Add client'}
            </Button>
          </>
        }
      >
        <form id="client-form" onSubmit={submit} className="space-y-3">
          <FormError error={createClient.error} />

          <Field label="Client name" htmlFor="client-name">
            <Input
              id="client-name"
              required
              minLength={2}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>

          <Field label="Company" htmlFor="client-company">
            <Input
              id="client-company"
              required
              minLength={2}
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
            />
          </Field>

          <Field label="Contact email" htmlFor="client-email">
            <Input
              id="client-email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
