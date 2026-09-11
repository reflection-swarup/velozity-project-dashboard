import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary:
    'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
};

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: Props) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  />
);
