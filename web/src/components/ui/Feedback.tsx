import clsx from 'clsx';
import { ApiError } from '../../lib/api';

export const Spinner = ({ className }: { className?: string }) => (
  <span
    className={clsx(
      'inline-block size-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600',
      className,
    )}
  />
);

export const Loading = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
    <Spinner />
    {label}
  </div>
);

export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="px-4 py-10 text-center">
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
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
    <div className="m-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
      <p className="font-medium">{forbidden ? 'Not allowed' : 'Request failed'}</p>
      <p className="mt-0.5 text-rose-600">{message}</p>
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
    <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
      <p className="font-medium">{message}</p>
      {details.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
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
