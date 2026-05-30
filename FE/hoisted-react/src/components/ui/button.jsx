import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:brightness-95',
  ghost:   'bg-transparent text-ink border border-line hover:bg-bg-2',
  quiet:   'bg-transparent text-ink-2 hover:text-ink hover:bg-bg-2',
};
const SIZES = {
  sm: 'h-[30px] px-3 text-[12.5px] rounded-md',
  md: 'h-[38px] px-4 text-[13.5px] rounded-lg',
  lg: 'h-[46px] px-5 text-sm rounded-[9px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 font-sans font-semibold whitespace-nowrap transition active:translate-y-px',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
