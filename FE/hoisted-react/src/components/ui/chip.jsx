import { cn } from '@/lib/utils';

export function Chip({ children, variant = 'solid', className }) {
  return (
    <span className={cn(variant === 'line' ? 'chip-line' : 'chip', className)}>
      {children}
    </span>
  );
}
