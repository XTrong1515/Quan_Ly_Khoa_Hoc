import { cn } from '@/lib/utils';

// Neo-brutalism: viền đậm + bóng cứng; .press làm nút "lún" về phía bóng khi hover / nhấn.
const VARIANTS = {
  primary: 'press bg-pop text-pop-ink border-2 border-edge',
  ghost:   'press bg-bg-1 text-ink border-2 border-edge hover:bg-bg-2',
  quiet:   'bg-transparent text-ink-2 border-2 border-transparent hover:text-ink hover:bg-bg-2',
};
const SIZES = {
  sm: 'h-[30px] px-3 text-[12.5px] rounded-sm',
  md: 'h-[38px] px-4 text-[13.5px] rounded-sm',
  lg: 'h-[46px] px-5 text-sm rounded-sm',
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
        'inline-flex items-center gap-2 font-sans font-bold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60',
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
