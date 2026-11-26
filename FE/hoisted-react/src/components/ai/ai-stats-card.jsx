import { useQuery } from '@tanstack/react-query';
import { ThumbsDown, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

const ASSISTANT_ROWS = [
  { key: 'learner', label: 'Học viên' },
  { key: 'lesson', label: 'Trong bài học' },
  { key: 'instructor', label: 'Giảng viên' },
];
const KIND_LABEL = { LEARNER: 'Học viên', INSTRUCTOR: 'Giảng viên' };

const seconds = (ms) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}s`;

function Metric({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] text-ink-3 uppercase tracking-widest">{label}</p>
      <p className="mt-1.5 font-mono font-extrabold tracking-tight text-[24px] leading-none tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Thẻ "Trợ lý AI · 30 ngày" trên dashboard admin — số câu hỏi theo trợ lý, tỷ lệ hữu ích từ 👍/👎,
 * thời gian trả lời, và các câu trả lời bị chê gần nhất để chỉnh prompt. Chỉ hiện số liệu có thật.
 */
export function AiStatsCard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin-ai-stats'],
    queryFn: () => api.get('/api/admin/ai-stats').then((r) => r.data),
  });

  if (isPending) return <div className="card p-5 h-[220px] animate-pulse motion-reduce:animate-none" aria-label="Đang tải thống kê trợ lý AI" />;
  if (isError) {
    return (
      <div className="card p-5">
        <p className="font-mono text-[11px] text-ink-3 uppercase tracking-widest">// Trợ lý AI · 30 ngày</p>
        <p className="mt-3 text-[13px] text-ink-2">Chưa tải được thống kê trợ lý AI.</p>
        <button type="button" onClick={() => refetch()}
          className="mt-2 inline-flex items-center gap-1.5 h-[30px] px-3 rounded-md border-2 border-edge text-[12.5px] font-semibold text-ink hover:bg-bg-2">
          <RotateCcw className="w-3.5 h-3.5" /> Tải lại
        </button>
      </div>
    );
  }

  const { questions, assistants, feedback, latencyMs, disliked, days } = data;
  const maxQ = Math.max(1, ...ASSISTANT_ROWS.map((r) => assistants[r.key].questions));

  return (
    <div className="card p-5">
      <p className="font-mono text-[11px] text-ink-3 uppercase tracking-widest mb-5">// Trợ lý AI · {days} ngày</p>
      {!questions ? (
        <p className="font-mono text-[12px] text-ink-3">// Chưa có câu hỏi nào cho trợ lý trong {days} ngày qua</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="Câu hỏi" value={questions.toLocaleString('vi-VN')} />
              <Metric label="Hữu ích"
                value={feedback.helpfulRate === null ? '—' : `${Math.round(feedback.helpfulRate * 100)}%`}
                hint={feedback.rated ? `${feedback.up} hữu ích · ${feedback.down} chưa tốt` : 'Chưa có đánh giá'} />
              <Metric label="Trả lời" value={latencyMs ? seconds(latencyMs.median) : '—'}
                hint={latencyMs ? `trung vị · p90 ${seconds(latencyMs.p90)}` : undefined} />
            </div>
            <div className="mt-6 space-y-3">
              {ASSISTANT_ROWS.map(({ key, label }) => {
                const a = assistants[key];
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="text-ink-2">{label}</span>
                      <span className="font-mono text-[11.5px] text-ink-3 tabular-nums">
                        {a.questions} câu · {a.conversations} hội thoại
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-bg-2 overflow-hidden">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(a.questions / maxQ) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink mb-3">
              <ThumbsDown className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" /> Câu trả lời bị đánh giá chưa tốt
            </p>
            {disliked.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {disliked.map((d) => (
                  <li key={d.id} className="py-2.5">
                    <p className="text-[12.5px] text-ink line-clamp-1">{d.question ?? '(không rõ câu hỏi)'}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3 line-clamp-2">{d.answer}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-3">
                      {KIND_LABEL[d.kind] ?? d.kind}{d.inLesson ? ' · trong bài học' : ''} · {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-mono text-[12px] text-ink-3">// Chưa có câu trả lời nào bị chê</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
