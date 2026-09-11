import clsx from 'clsx';

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={clsx('rounded-xl bg-surface ring-1 ring-line', className)}>{children}</div>
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
  <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
    <div className="min-w-0">
      <h2 className="text-md font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

const toneText: Record<string, string> = {
  default: 'text-ink',
  danger: 'text-danger',
  success: 'text-success',
  accent: 'text-accent',
};

export const StatCard = ({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'danger' | 'success' | 'accent';
  icon?: React.ReactNode;
}) => (
  <Card className="px-4 py-3.5 transition-colors duration-150 hover:ring-line-strong">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      {icon ? <span className="text-subtle">{icon}</span> : null}
    </div>
    <p className={clsx('mt-2 text-3xl font-bold tabular-nums', toneText[tone])}>{value}</p>
    {hint ? <p className="mt-1 text-[13px] text-muted">{hint}</p> : null}
  </Card>
);
