import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  useAccessRequests,
  useApproveAccessRequest,
  useRejectAccessRequest,
} from '../hooks/queries';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorState, FormError, ListSkeleton } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { ROLE_LABELS, formatDateTime, relativeTime } from '../lib/format';
import type { AccessRequest, AccessRequestStatus, RequestableRole } from '../types';

const STATUS_TONE: Record<AccessRequestStatus, string> = {
  PENDING: 'bg-warn-soft text-warn',
  APPROVED: 'bg-success-soft text-success',
  REJECTED: 'bg-raised text-muted',
};

const ApproveDialog = ({
  request,
  onClose,
}: {
  request: AccessRequest | null;
  onClose: () => void;
}) => {
  const approve = useApproveAccessRequest();
  const [role, setRole] = useState<RequestableRole | ''>('');

  return (
    <Modal
      open={Boolean(request)}
      title={request ? `Approve ${request.name}` : 'Approve'}
      description="This creates the account and grants the role. Project membership is decided separately by whoever manages the project."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={approve.isPending}
            onClick={() =>
              request &&
              approve.mutate(
                { id: request.id, ...(role && role !== request.requestedRole ? { role } : {}) },
                {
                  onSuccess: () => {
                    setRole('');
                    onClose();
                  },
                },
              )
            }
          >
            {approve.isPending ? 'Approving' : 'Approve and create account'}
          </Button>
        </>
      }
    >
      {request ? (
        <div className="space-y-3">
          <FormError error={approve.error} />

          <dl className="divide-y divide-line rounded-lg bg-raised px-3 text-md">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Email</dt>
              <dd className="truncate font-medium text-ink">{request.email}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Requested</dt>
              <dd className="font-medium text-ink">{ROLE_LABELS[request.requestedRole]}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted">Prefers to work on</dt>
              <dd className="truncate font-medium text-ink">
                {request.preferredProject
                  ? `${request.preferredProject.name} (${request.preferredProject.managerName})`
                  : 'No preference'}
              </dd>
            </div>
          </dl>

          <Field
            label="Grant this role"
            htmlFor="approve-role"
            hint="You can grant something other than what was requested"
          >
            <Select
              id="approve-role"
              value={role || request.requestedRole}
              onChange={(event) => setRole(event.target.value as RequestableRole)}
            >
              <option value="DEVELOPER">Developer</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
            </Select>
          </Field>

          {request.requestedRole === 'DEVELOPER' ? (
            <p className="rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
              {request.preferredProject
                ? `${request.preferredProject.managerName} can add them to ${request.preferredProject.name} once the account exists.`
                : 'A project manager can add them to one of their projects once the account exists.'}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};

const RejectDialog = ({
  request,
  onClose,
}: {
  request: AccessRequest | null;
  onClose: () => void;
}) => {
  const reject = useRejectAccessRequest();
  const [reason, setReason] = useState('');

  return (
    <Modal
      open={Boolean(request)}
      title={request ? `Reject ${request.name}` : 'Reject'}
      description="No account is created. The reason is kept for the record."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reject.isPending}
            onClick={() =>
              request &&
              reject.mutate(
                { id: request.id, ...(reason.trim() ? { reason: reason.trim() } : {}) },
                {
                  onSuccess: () => {
                    setReason('');
                    onClose();
                  },
                },
              )
            }
          >
            {reject.isPending ? 'Rejecting' : 'Reject request'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError error={reject.error} />
        <Field label="Reason" htmlFor="reject-reason" hint="Optional, shown in the audit trail">
          <Input
            id="reject-reason"
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
};

const RequestRow = ({
  request,
  onApprove,
  onReject,
}: {
  request: AccessRequest;
  onApprove: () => void;
  onReject: () => void;
}) => (
  <li className="px-4 py-4">
    <div className="flex flex-wrap items-start gap-3">
      <Avatar name={request.name} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-md font-semibold text-ink">{request.name}</p>
          <Badge className={STATUS_TONE[request.status]}>{request.status}</Badge>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">{request.email}</p>

        <p className="mt-2 text-md text-muted">
          Asked for{' '}
          <span className="font-semibold text-ink">{ROLE_LABELS[request.requestedRole]}</span>
          {request.preferredProject ? (
            <>
              {' · would like to work on '}
              <span className="font-semibold text-ink">{request.preferredProject.name}</span>
              <span className="text-subtle"> ({request.preferredProject.managerName})</span>
            </>
          ) : null}
        </p>

        {request.note ? (
          <p className="mt-2 rounded-lg bg-raised px-3 py-2 text-[13px] text-muted">
            “{request.note}”
          </p>
        ) : null}

        <p className="mt-2 text-[13px] text-subtle">
          Requested {relativeTime(request.createdAt)}
          {request.reviewedBy && request.reviewedAt ? (
            <>
              {' · '}
              {request.status === 'APPROVED' ? 'approved' : 'rejected'} by {request.reviewedBy.name}{' '}
              on {formatDateTime(request.reviewedAt)}
            </>
          ) : null}
          {request.decisionReason ? ` · ${request.decisionReason}` : null}
        </p>
      </div>

      {request.status === 'PENDING' ? (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onReject}>
            Reject
          </Button>
          <Button size="sm" onClick={onApprove}>
            Approve
          </Button>
        </div>
      ) : null}
    </div>
  </li>
);

export const AccessRequestsPage = () => {
  const [params, setParams] = useSearchParams();
  const statusFilter = (params.get('status') as AccessRequestStatus | null) ?? undefined;
  const requests = useAccessRequests(statusFilter);

  const [approving, setApproving] = useState<AccessRequest | null>(null);
  const [rejecting, setRejecting] = useState<AccessRequest | null>(null);

  const items = requests.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Access requests"
        description="Approving creates the account and grants the role. Who works on which project is decided by the manager who owns it."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Access requests' }]}
        actions={
          <div className="flex rounded-lg bg-raised p-0.5">
            {([undefined, 'PENDING', 'APPROVED', 'REJECTED'] as const).map((option) => (
              <button
                key={option ?? 'all'}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  if (option) next.set('status', option);
                  else next.delete('status');
                  setParams(next, { replace: true });
                }}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors duration-150',
                  statusFilter === option
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-muted hover:text-ink',
                )}
              >
                {option ? option.toLowerCase() : 'all'}
              </button>
            ))}
          </div>
        }
      />

      <Section
        title="Queue"
        description={
          requests.data ? `${requests.data.pendingCount} awaiting review` : 'Loading the queue'
        }
      >
        <Card className="overflow-hidden">
          {requests.isPending ? <ListSkeleton rows={3} /> : null}
          {requests.isError ? <ErrorState error={requests.error} /> : null}

          {requests.isSuccess && items.length === 0 ? (
            <EmptyState
              title="Nothing to review"
              hint="New requests arrive here, and you are notified when one does"
            />
          ) : null}

          <ul className="divide-y divide-line">
            {items.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onApprove={() => setApproving(request)}
                onReject={() => setRejecting(request)}
              />
            ))}
          </ul>
        </Card>
      </Section>

      <ApproveDialog request={approving} onClose={() => setApproving(null)} />
      <RejectDialog request={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
};
