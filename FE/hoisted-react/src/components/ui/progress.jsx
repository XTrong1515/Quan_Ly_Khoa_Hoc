import { clampPct } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Progress({ value, className }) {
  return (
    <div className={cn('progress', className)}>
      <span style={{ width: clampPct(value) + '%' }} />
    </div>
  );
}
