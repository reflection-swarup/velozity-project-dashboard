import clsx from 'clsx';

const control =
  'w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400';

export const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-600">
    {children}
  </label>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={clsx(control, className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={clsx(control, 'min-h-20 resize-y', className)} {...props} />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={clsx(control, 'pr-8', className)} {...props}>
    {children}
  </select>
);

export const Field = ({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
  </div>
);
