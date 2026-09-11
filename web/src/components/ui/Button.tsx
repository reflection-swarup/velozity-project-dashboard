import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 shadow-sm shadow-black/5',
  secondary:
    'bg-surface text-ink ring-1 ring-line hover:bg-raised disabled:opacity-50',
  ghost: 'text-muted hover:bg-raised hover:text-ink disabled:opacity-40',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: Props) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  />
);
