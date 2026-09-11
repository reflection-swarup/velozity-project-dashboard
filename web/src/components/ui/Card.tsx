import clsx from 'clsx';

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={clsx('rounded-xl bg-white ring-1 ring-slate-200', className)}>{children}</div>
);

export const CardHeader = ({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
    <div>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

export const StatCard = ({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}) => (
  <Card className="px-4 py-3">
    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
    <p
      className={clsx(
        'mt-1 text-2xl font-semibold tabular-nums',
        tone === 'danger' && 'text-rose-600',
        tone === 'success' && 'text-emerald-600',
        tone === 'default' && 'text-slate-900',
      )}
    >
      {value}
    </p>
    {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
  </Card>
);
