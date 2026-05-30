import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input', className)} {...props} />;
});

export function Field({ label, trailing, children, error }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="font-mono text-[12.5px] font-medium text-ink-2">{label}</label>
        {trailing && <span className="font-mono text-xs text-accent">{trailing}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-danger font-mono">{error}</p>}
    </div>
  );
}
