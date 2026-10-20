import { CheckCircle2, XCircle, Lock, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const STATUS_LABELS = {
  ACCEPTED:      { text: 'Đạt — tất cả test đều đúng', tone: 'success' },
  WRONG_ANSWER:  { text: 'Sai kết quả',                tone: 'danger' },
  RUNTIME_ERROR: { text: 'Lỗi khi chạy',               tone: 'danger' },
  TIME_LIMIT:    { text: 'Quá thời gian cho phép',      tone: 'danger' },
  MEMORY_LIMIT:  { text: 'Vượt giới hạn bộ nhớ',        tone: 'danger' },
  COMPILE_ERROR: { text: 'Lỗi cú pháp',                 tone: 'danger' },
  PASSED:        { text: 'Đạt',                         tone: 'success' },
  SKIPPED:       { text: 'Bỏ qua',                      tone: 'muted' },
};

/** Bảng kết quả chấm — dùng chung cho học viên (test ẩn bị che) và người soạn bài. */
export function ExerciseResults({ result, title }) {
  if (!result) return null;
  const head = STATUS_LABELS[result.status] ?? { text: result.status, tone: 'danger' };

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold',
        head.tone === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
      )}>
        <span>{title ? `${title}: ` : ''}{head.text}</span>
        <span className="font-mono text-[11px] font-normal">{result.passed}/{result.total} test · {result.timeMs} ms</span>
      </div>

      {result.error && (
        <pre className="font-mono text-[12px] text-danger bg-danger/5 rounded-lg px-3 py-2 whitespace-pre-wrap">{result.error}</pre>
      )}

      {result.results?.map((r) => {
        const tone = STATUS_LABELS[r.status]?.tone ?? 'danger';
        const Icon = r.hidden && !r.input ? Lock : tone === 'success' ? CheckCircle2 : tone === 'muted' ? MinusCircle : XCircle;
        return (
          <div key={r.index} className="border border-line rounded-lg px-3 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <Icon className={cn('w-3.5 h-3.5 shrink-0',
                tone === 'success' ? 'text-success' : tone === 'muted' ? 'text-ink-3' : 'text-danger')} />
              <span className="font-medium text-ink">
                {r.hidden ? `Test ẩn #${r.index}` : `Test #${r.index}`}
              </span>
              <span className="text-ink-3">{STATUS_LABELS[r.status]?.text ?? r.status}</span>
              <span className="ml-auto font-mono text-[10.5px] text-ink-3">{r.timeMs} ms</span>
            </div>
            {r.input !== undefined && (
              <dl className="mt-1.5 grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5 font-mono text-[11.5px]">
                <dt className="text-ink-3">input</dt><dd className="text-ink-2 break-all">{r.input}</dd>
                <dt className="text-ink-3">mong đợi</dt><dd className="text-ink-2 break-all">{r.expected}</dd>
                {r.actual !== null && r.actual !== undefined && (
                  <><dt className="text-ink-3">nhận được</dt><dd className={cn('break-all', r.passed ? 'text-success' : 'text-danger')}>{r.actual}</dd></>
                )}
                {r.error && <><dt className="text-ink-3">lỗi</dt><dd className="text-danger break-all">{r.error}</dd></>}
              </dl>
            )}
            {r.logs?.length > 0 && (
              <pre className="mt-1.5 font-mono text-[11px] text-ink-3 bg-bg-2 rounded px-2 py-1 whitespace-pre-wrap max-h-24 overflow-auto">
                {r.logs.join('\n')}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
