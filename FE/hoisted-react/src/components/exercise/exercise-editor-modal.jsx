import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExerciseResults } from './exercise-results.jsx';

const CodeEditor = lazy(() => import('./code-editor.jsx'));

const inputCls = 'w-full px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent';
const labelCls = 'block font-mono text-[9px] text-ink-3 mb-1 uppercase tracking-widest';

const EMPTY = {
  title: '', functionName: 'solve', timeLimitMs: 1000,
  descriptionMd: '## Đề bài\n\nViết hàm `solve(...)` …\n\n## Ví dụ\n\n',
  starterCode: 'function solve() {\n  // Viết code của bạn ở đây\n}\n',
  solutionCode: '',
  tests: [{ input: '[]', expected: 'null', hidden: false }],
};

/** Soạn bài tập lập trình cho 1 bài học (admin / giảng viên — cùng API qua apiBase). */
export function ExerciseEditorModal({ apiBase, lesson, onClose }) {
  const qc = useQueryClient();
  const queryKey = ['author-exercise', apiBase, lesson.id];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(`${apiBase}/lessons/${lesson.id}/exercise`).then((r) => r.data),
  });

  const [form, setForm]         = useState(null);
  const [check, setCheck]       = useState(null);
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    if (isLoading || form) return;
    setForm(data?.exercise ? { ...data.exercise } : { ...EMPTY, title: lesson.title });
  }, [data, isLoading, form, lesson.title]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setTest = (i, key, value) => setForm((f) => ({ ...f, tests: f.tests.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)) }));

  const payload = () => ({
    title: form.title, functionName: form.functionName, timeLimitMs: Number(form.timeLimitMs),
    descriptionMd: form.descriptionMd, starterCode: form.starterCode, solutionCode: form.solutionCode,
    testCases: form.tests.map((t) => ({ input: t.input, expected: t.expected, hidden: !!t.hidden })),
  });

  const validate = async () => {
    setBusy(true);
    try {
      const { data: res } = await api.post(`${apiBase}/lessons/${lesson.id}/exercise/validate`, payload());
      setCheck(res);
      if (res.status === 'ACCEPTED') toast.success('Lời giải qua mọi test — đề hợp lệ');
    } catch (err) { toast.error(apiMessage(err, 'Chưa kiểm tra được lời giải. Thử lại sau giây lát.')); }
    finally { setBusy(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`${apiBase}/lessons/${lesson.id}/exercise`, payload());
      toast.success('Đã lưu bài tập');
      qc.invalidateQueries({ queryKey });
      onClose();
    } catch (err) { toast.error(apiMessage(err, 'Chưa lưu được bài tập. Nội dung vẫn còn trong form — thử lại.')); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Xóa bài tập này? Lịch sử nộp bài của học viên cũng bị xóa.')) return;
    try {
      await api.delete(`${apiBase}/lessons/${lesson.id}/exercise`);
      toast.success('Đã xóa bài tập');
      qc.invalidateQueries({ queryKey });
      onClose();
    } catch (err) { toast.error(apiMessage(err, 'Chưa xóa được bài tập. Thử lại sau giây lát.')); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-bg border border-line rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line shrink-0">
          <div>
            <p className="font-mono text-[9px] text-ink-3 uppercase tracking-widest mb-0.5">Bài tập lập trình</p>
            <p className="font-semibold text-[14px] text-ink truncate max-w-[560px]">{lesson.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-2 text-ink-3"><X className="w-4 h-4" /></button>
        </div>

        {!form ? (
          <p className="p-6 font-mono text-[12px] text-ink-3">Đang tải…</p>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-[1fr_180px_120px] gap-3">
              <div><label className={labelCls}>Tiêu đề *</label>
                <input value={form.title} onChange={(e) => set('title')(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tên hàm học viên viết *</label>
                <input value={form.functionName} onChange={(e) => set('functionName')(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="sum" /></div>
              <div><label className={labelCls}>Giới hạn (ms)</label>
                <input type="number" min="100" max="5000" value={form.timeLimitMs} onChange={(e) => set('timeLimitMs')(e.target.value)} className={inputCls} /></div>
            </div>

            <div><label className={labelCls}>Đề bài (Markdown) *</label>
              <textarea value={form.descriptionMd} onChange={(e) => set('descriptionMd')(e.target.value)} rows={6}
                className={cn(inputCls, 'font-mono text-[12.5px] resize-y')} /></div>

            <Suspense fallback={<p className="font-mono text-[12px] text-ink-3">Đang tải editor…</p>}>
              <div className="grid lg:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Code mẫu cho học viên</label>
                  <div className="border border-line rounded-lg overflow-hidden"><CodeEditor value={form.starterCode} onChange={set('starterCode')} height="160px" /></div>
                </div>
                <div>
                  <label className={labelCls}>Lời giải (ẩn — dùng để kiểm tra đề)</label>
                  <div className="border border-line rounded-lg overflow-hidden"><CodeEditor value={form.solutionCode} onChange={set('solutionCode')} height="160px" /></div>
                </div>
              </div>
            </Suspense>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>Test case — input là mảng tham số JSON, expected là JSON</label>
                <button type="button" onClick={() => set('tests')([...form.tests, { input: '[]', expected: 'null', hidden: true }])}
                  className="flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"><Plus className="w-3 h-3" /> Thêm test</button>
              </div>
              <div className="space-y-2">
                {form.tests.map((t, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_1fr_auto_auto] gap-2 items-center">
                    <span className="font-mono text-[11px] text-ink-3 text-right">#{i + 1}</span>
                    <input value={t.input} onChange={(e) => setTest(i, 'input', e.target.value)} className={cn(inputCls, 'font-mono text-[12px]')} placeholder="[1, 2]" />
                    <input value={t.expected} onChange={(e) => setTest(i, 'expected', e.target.value)} className={cn(inputCls, 'font-mono text-[12px]')} placeholder="3" />
                    <label className="flex items-center gap-1 text-[11.5px] text-ink-2 cursor-pointer whitespace-nowrap">
                      <input type="checkbox" checked={!!t.hidden} onChange={(e) => setTest(i, 'hidden', e.target.checked)} className="accent-accent" /> Ẩn
                    </label>
                    <button type="button" disabled={form.tests.length === 1}
                      onClick={() => set('tests')(form.tests.filter((_, idx) => idx !== i))}
                      className="p-1 rounded text-ink-3 hover:text-danger hover:bg-danger/10 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>

            {check && <ExerciseResults result={check} title="Kiểm tra lời giải" />}
          </div>
        )}

        {form && (
          <div className="flex items-center gap-2 px-5 py-3 border-t border-line shrink-0">
            {data?.exercise && (
              <button onClick={remove} className="px-3 py-1.5 rounded-lg text-[12px] text-ink-3 hover:text-danger hover:bg-danger/10">Xóa bài tập</button>
            )}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={validate} disabled={busy || !form.solutionCode.trim()}
                title={form.solutionCode.trim() ? 'Chạy lời giải qua toàn bộ test' : 'Cần nhập lời giải'}>
                <FlaskConical className="w-3.5 h-3.5" /> Kiểm tra đề
              </Button>
              <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Đang xử lý…' : 'Lưu bài tập'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
