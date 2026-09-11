import clsx from 'clsx';
import { ApiError } from '../../lib/api';

export const Spinner = ({ className }: { className?: string }) => (
  <span
    className={clsx(
      'inline-block size-4 animate-spin rounded-full border-2 border-line border-t-accent',
      className,
    )}
  />
);

export const Skeleton = ({ className }: { className?: string }) => (
  <span className={clsx('skeleton block rounded-md', className)} />
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <ul className="divide-y divide-line">
    {Array.from({ length: rows }).map((_, index) => (
      <li key={index} className="flex items-center gap-3 px-4 py-3.5">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16" />
      </li>
    ))}
  </ul>
);

export const CardSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="rounded-xl bg-surface p-4 ring-1 ring-line">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3 h-7 w-14" />
      </div>
    ))}
  </div>
);

export const Loading = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted">
    <Spinner />
    {label}
  </div>
);

export const EmptyState = ({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) => (
  <div className="px-4 py-12 text-center">
    <p className="text-sm font-medium text-ink">{title}</p>
    {hint ? <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{hint}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);

export const ErrorState = ({ error }: { error: unknown }) => {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong';

  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <div className="m-4 rounded-lg bg-danger-soft px-4 py-3 text-sm ring-1 ring-line">
      <p className="font-medium text-danger">{forbidden ? 'Not allowed' : 'Request failed'}</p>
      <p className="mt-0.5 text-muted">{message}</p>
    </div>
  );
};

export const FormError = ({ error }: { error: unknown }) => {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  const details =
    error instanceof ApiError && Array.isArray(error.details)
      ? (error.details as { path: string; message: string }[])
      : [];

  return (
    <div className="animate-fade rounded-lg bg-danger-soft px-3 py-2 text-xs ring-1 ring-line">
      <p className="font-medium text-danger">{message}</p>
      {details.length > 0 ? (
        <ul className="mt-1 space-y-0.5 text-muted">
          {details.map((detail) => (
            <li key={detail.path}>
              {detail.path}: {detail.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
