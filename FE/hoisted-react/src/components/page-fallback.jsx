import { Loader2 } from 'lucide-react';

/** Hiện trong lúc tải chunk của trang (route lazy) — layout (nav, sidebar) vẫn giữ nguyên. */
export function PageFallback() {
  return (
    <div className="min-h-[50vh] grid place-items-center bg-bg" role="status" aria-label="Đang tải trang">
      <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
    </div>
  );
}
