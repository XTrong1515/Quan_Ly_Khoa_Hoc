import { cn } from '@/lib/utils';

/** IDE-style chrome wrapper — 3 dots + filename tab. */
export function IdeFrame({ tab = 'index.js', className, children }) {
  return (
    <div className={cn('ide', className)}>
      <div className="ide-bar">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
          <span className="w-2.5 h-2.5 rounded-full bg-line" />
        </div>
        <div className="ide-tab">{tab}</div>
      </div>
      {children}
    </div>
  );
}
