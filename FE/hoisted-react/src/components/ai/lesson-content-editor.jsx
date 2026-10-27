import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { RichContent } from '@/components/rich-content.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const inputCls = 'w-full px-3 py-2 text-[12.5px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent';
const LENGTHS = [['short', 'Ngắn (~400 từ)'], ['medium', 'Vừa (~750 từ)'], ['long', 'Dài (~1.200 từ)']];

/**
 * Soạn nội dung bài học (Markdown) + AI soạn bản nháp.
 * AI chỉ đề xuất: bản nháp hiện ở chế độ xem trước, giảng viên chọn thay thế / chèn rồi bấm "Lưu" của form.
 */
export function LessonContentEditor({ apiBase, lesson, value, onChange }) {
  const [tab, setTab]           = useState('edit');
  const [aiOpen, setAiOpen]     = useState(false);
  const [outline, setOutline]   = useState('');
  const [length, setLength]     = useState('medium');
  const [rewrite, setRewrite]   = useState(false);
  const [draft, setDraft]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`${apiBase}/lessons/${lesson.id}/ai/content`, { outline, length, rewrite }, { timeout: 120_000 });
      setDraft(data.markdown);
      toast.success('AI đã soạn bản nháp — xem lại trước khi dùng');
    } catch (err) {
      toast.error(apiMessage(err, 'AI chưa soạn được nội dung'));
    } finally { setLoading(false); }
  };

  const apply = (mode) => {
    onChange(mode === 'append' && value.trim() ? `${value.trim()}\n\n${draft}` : draft);
    setDraft(null);
    setAiOpen(false);
    setTab('preview');
    toast.message('Đã đưa bản nháp vào nội dung — bấm "Lưu" để lưu bài học');
  };

  return (
    <div className="mt-3 pt-3 border-t border-line">
      <div className="flex items-center gap-1 mb-2">
        <label className="font-mono text-[9px] text-ink-3 uppercase tracking-widest mr-2">Nội dung bài học (Markdown)</label>
        {[['edit', 'Soạn'], ['preview', 'Xem trước']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('px-2 py-0.5 rounded text-[11px]', tab === k ? 'bg-accent/10 text-accent' : 'text-ink-3 hover:text-ink')}>
            {l}
          </button>
        ))}
        {lesson && (
          <button type="button" onClick={() => setAiOpen((v) => !v)}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-accent hover:bg-accent/10">
            <Sparkles className="w-3 h-3" /> AI soạn nội dung
          </button>
        )}
      </div>

      {aiOpen && (
        <div className="mb-3 p-3 rounded-lg border border-accent/40 bg-accent/5 space-y-2">
          <textarea value={outline} onChange={(e) => setOutline(e.target.value.slice(0, 2000))} rows={3}
            placeholder="Dàn ý / ý chính muốn có (tuỳ chọn) — vd: var vs let/const, TDZ, ví dụ thực tế với vòng lặp"
            className={cn(inputCls, 'resize-y')} />
          <div className="flex flex-wrap items-center gap-3">
            <select value={length} onChange={(e) => setLength(e.target.value)} className={cn(inputCls, 'w-auto')}>
              {LENGTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer">
              <input type="checkbox" checked={rewrite} onChange={(e) => setRewrite(e.target.checked)} className="accent-accent" />
              Viết lại dựa trên nội dung đã lưu
            </label>
            <Button size="sm" type="button" onClick={generate} disabled={loading} className="ml-auto">
              {loading ? 'AI đang viết…' : draft ? 'Viết lại' : 'Soạn bản nháp'}
            </Button>
          </div>

          {draft && (
            <div className="rounded-lg border border-line bg-bg">
              <div className="max-h-80 overflow-y-auto p-4"><RichContent content={draft} /></div>
              <div className="flex justify-end gap-2 px-3 py-2 border-t border-line">
                <Button size="sm" variant="ghost" type="button" onClick={() => setDraft(null)}>Bỏ</Button>
                {value.trim() && <Button size="sm" variant="ghost" type="button" onClick={() => apply('append')}>Chèn vào cuối</Button>}
                <Button size="sm" type="button" onClick={() => apply('replace')}>{value.trim() ? 'Thay thế nội dung' : 'Dùng bản nháp'}</Button>
              </div>
            </div>
          )}
          <p className="font-mono text-[10px] text-ink-3">// AI có thể sai — hãy kiểm tra kiến thức và ví dụ code trước khi xuất bản.</p>
        </div>
      )}

      {tab === 'edit' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={8}
          placeholder={'## Mục tiêu bài học\n\n- …\n\n```js\nconsole.log("Hello Hoisted");\n```'}
          className={cn(inputCls, 'font-mono resize-y')} />
      ) : (
        <div className="min-h-[120px] max-h-96 overflow-y-auto p-4 rounded-lg border border-line bg-bg">
          {value.trim() ? <RichContent content={value} /> : <p className="font-mono text-[12px] text-ink-3">// Chưa có nội dung</p>}
        </div>
      )}
    </div>
  );
}
