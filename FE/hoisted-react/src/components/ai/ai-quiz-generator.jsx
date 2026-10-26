import { useState } from 'react';
import { Sparkles, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputCls = 'w-full px-2.5 py-1.5 text-[12.5px] bg-bg border border-line rounded-md text-ink focus:outline-none focus:border-accent';
const DIFFICULTIES = [['easy', 'Dễ'], ['medium', 'Trung bình'], ['hard', 'Khó']];

/**
 * AI soạn bản nháp câu hỏi quiz — giảng viên xem, sửa, bỏ chọn rồi mới thêm vào quiz (human-in-the-loop).
 * quizId = null → tự tạo quiz cho bài học trước khi thêm câu hỏi.
 */
export function AiQuizGenerator({ apiBase, lesson, quizId, onAdded }) {
  const [open, setOpen]             = useState(false);
  const [count, setCount]           = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [focus, setFocus]           = useState('');
  const [drafts, setDrafts]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`${apiBase}/lessons/${lesson.id}/ai/quiz`, { count, difficulty, focus }, { timeout: 90_000 });
      setDrafts(data.questions.map((q) => ({ ...q, include: true })));
      toast.success(`AI đã soạn ${data.questions.length} câu${data.rejected ? ` (loại ${data.rejected} câu sai định dạng)` : ''} — hãy kiểm tra trước khi thêm`);
    } catch (err) {
      toast.error(apiMessage(err, 'AI chưa soạn được câu hỏi'));
    } finally { setLoading(false); }
  };

  const patch = (i, fn) => setDrafts((ds) => ds.map((d, idx) => (idx === i ? fn(d) : d)));
  const toggleCorrect = (i, oi) => patch(i, (d) => ({
    ...d,
    options: d.options.map((o, idx) => (d.type === 'single' ? { ...o, isCorrect: idx === oi } : idx === oi ? { ...o, isCorrect: !o.isCorrect } : o)),
  }));

  const chosen = drafts.filter((d) => d.include);

  const addToQuiz = async () => {
    const invalid = chosen.find((d) => !d.question.trim() || d.options.some((o) => !o.text.trim()) || !d.options.some((o) => o.isCorrect));
    if (invalid) { toast.error('Có câu thiếu nội dung hoặc chưa chọn đáp án đúng'); return; }
    setSaving(true);
    try {
      let id = quizId;
      if (!id) ({ data: { quizId: id } } = await api.post(`${apiBase}/lessons/${lesson.id}/quiz`, { title: '', passScore: 70 }));
      for (const d of chosen) {
        await api.post(`${apiBase}/quizzes/${id}/questions`, {
          question: d.question.trim(), type: d.type, options: d.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        });
      }
      toast.success(`Đã thêm ${chosen.length} câu hỏi vào quiz`);
      setDrafts([]);
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-accent/50 text-accent text-[12.5px] font-medium hover:bg-accent/5">
        <Sparkles className="w-4 h-4" /> Tạo câu hỏi bằng AI
      </button>
    );
  }

  return (
    <div className="border border-accent/40 rounded-lg p-3 space-y-3 bg-accent/5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest flex-1">AI soạn bản nháp — bạn duyệt trước khi lưu</p>
        <button onClick={() => { setOpen(false); setDrafts([]); }} className="text-[11.5px] text-ink-3 hover:text-ink">Đóng</button>
      </div>

      <div className="grid grid-cols-[80px_140px_1fr_auto] gap-2 items-end">
        <label className="text-[11px] text-ink-3">Số câu
          <input type="number" min="1" max="10" value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, +e.target.value)))} className={inputCls} />
        </label>
        <label className="text-[11px] text-ink-3">Độ khó
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
            {DIFFICULTIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-ink-3">Tập trung vào (tuỳ chọn)
          <input value={focus} onChange={(e) => setFocus(e.target.value.slice(0, 300))} placeholder="vd: TDZ của let/const" className={inputCls} />
        </label>
        <Button size="sm" onClick={generate} disabled={loading}>{loading ? 'AI đang soạn…' : drafts.length ? 'Soạn lại' : 'Soạn câu hỏi'}</Button>
      </div>

      {drafts.map((d, i) => (
        <div key={i} className={cn('rounded-lg border p-3 bg-bg space-y-2', d.include ? 'border-line' : 'border-line opacity-50')}>
          <div className="flex items-start gap-2">
            <input type="checkbox" checked={d.include} onChange={(e) => patch(i, (x) => ({ ...x, include: e.target.checked }))} className="accent-accent mt-2" title="Thêm câu này" />
            <textarea value={d.question} onChange={(e) => patch(i, (x) => ({ ...x, question: e.target.value }))} rows={2} className={cn(inputCls, 'resize-y')} />
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-2 text-ink-3 shrink-0 mt-1">{d.type === 'single' ? '1 đáp án' : 'nhiều đáp án'}</span>
            <button onClick={() => setDrafts((ds) => ds.filter((_, idx) => idx !== i))} className="p-1 text-ink-3 hover:text-danger" title="Bỏ câu này"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5 pl-6">
            {d.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-1.5">
                <button onClick={() => toggleCorrect(i, oi)} title="Đáp án đúng"
                  className={cn('w-5 h-5 rounded grid place-items-center shrink-0 border', o.isCorrect ? 'bg-success border-success text-bg' : 'border-line text-transparent')}>
                  <Check className="w-3 h-3" />
                </button>
                <input value={o.text} onChange={(e) => patch(i, (x) => ({ ...x, options: x.options.map((y, idx) => (idx === oi ? { ...y, text: e.target.value } : y)) }))} className={inputCls} />
              </div>
            ))}
          </div>
          {d.explanation && <p className="pl-6 text-[11.5px] text-ink-3">💡 {d.explanation}</p>}
        </div>
      ))}

      {drafts.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" onClick={addToQuiz} disabled={saving || !chosen.length}>
            {saving ? 'Đang thêm…' : `Thêm ${chosen.length} câu vào quiz`}
          </Button>
        </div>
      )}
    </div>
  );
}
