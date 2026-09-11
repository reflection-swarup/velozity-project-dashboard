import clsx from 'clsx';

// Single brand asset, so dark mode inverts lightness and rotates the hue back
// to keep the red chevrons red instead of flipping them to cyan.
export const Logo = ({ className }: { className?: string }) => (
  <img
    src="/velozity-logo.png"
    alt="Velozity Global Solutions"
    width={165}
    height={44}
    className={clsx('w-auto shrink-0 select-none dark:invert dark:hue-rotate-180', className)}
  />
);
