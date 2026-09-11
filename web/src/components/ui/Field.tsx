import clsx from 'clsx';

const control =
  'w-full rounded-lg border-0 bg-surface px-3 text-md text-ink ring-1 ring-line transition-shadow duration-150 placeholder:text-subtle focus:ring-2 focus:ring-accent disabled:opacity-60';

export const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink">
    {children}
  </label>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={clsx(control, 'h-10', className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={clsx(control, 'min-h-20 resize-y py-2', className)} {...props} />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={clsx(control, 'h-10 pr-8', className)} {...props}>
    {children}
  </select>
);

export const Field = ({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && !error ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
  </div>
);
