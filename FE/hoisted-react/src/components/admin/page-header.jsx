/* Shared header for /admin pages: terminal-path eyebrow + title + actions */
export function AdminPageHeader({ path, title, desc, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <p className="eyebrow mb-1.5">
          <span className="text-accent">~/admin</span> <span className="text-ink-3">/ {path}</span>
        </p>
        <h1 className="font-display font-bold text-[24px] leading-tight">{title}</h1>
        {desc && <p className="text-[13px] text-ink-3 mt-1">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
