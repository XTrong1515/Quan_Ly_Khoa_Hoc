import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Play, Send, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { ExerciseResults } from './exercise-results.jsx';

const CodeEditor = lazy(() => import('./code-editor.jsx'));

export const exerciseQueryKey = (lessonId) => ['lesson-exercise', String(lessonId)];

const draftKey = (exerciseId) => `hoisted.exercise.${exerciseId}`;
const readDraft = (id) => { try { return localStorage.getItem(draftKey(id)); } catch { return null; } };
const writeDraft = (id, code) => { try { localStorage.setItem(draftKey(id), code); } catch { /* bỏ qua */ } };

const MARKDOWN_CLS = 'text-[13.5px] text-ink-2 leading-[1.7] [&_p]:mb-3 [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_h1]:font-display [&_h2]:font-display [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-bg-2 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0';

/** Khung làm bài tập lập trình của học viên: đề bài | editor | kết quả chấm. */
export function ExerciseWorkspace({ lessonId, onSolved }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: exerciseQueryKey(lessonId),
    queryFn: () => api.get(`/api/lessons/${lessonId}/exercise`).then((r) => r.data),
  });
  const exercise = data?.exercise;

  const [code, setCode]     = useState('');
  const [result, setResult] = useState(null);
  const [label, setLabel]   = useState('');
  const loadedFor = useRef(null);

  // Code ban đầu: bản nháp trên máy → bài nộp gần nhất → code mẫu
  useEffect(() => {
    if (!exercise || loadedFor.current === exercise.id) return;
    loadedFor.current = exercise.id;
    setCode(readDraft(exercise.id) ?? exercise.lastSubmission?.code ?? exercise.starterCode ?? '');
    setResult(null);
  }, [exercise]);

  const handleChange = (value) => {
    setCode(value);
    if (exercise) writeDraft(exercise.id, value);
  };

  const runMutation = useMutation({
    mutationFn: () => api.post(`/api/lessons/${lessonId}/exercise/run`, { code }).then((r) => r.data),
    onSuccess: (res) => { setResult(res); setLabel('Chạy thử'); },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/api/lessons/${lessonId}/exercise/submit`, { code }).then((r) => r.data),
    onSuccess: (res) => {
      setResult(res);
      setLabel('Nộp bài');
      qc.invalidateQueries({ queryKey: exerciseQueryKey(lessonId) });
      if (res.status === 'ACCEPTED') {
        toast.success(res.lessonCompleted ? 'Chính xác! Bài học đã được đánh dấu hoàn thành.' : 'Chính xác! Tất cả test đều đúng.');
        onSolved?.(res);
      }
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const busy = runMutation.isPending || submitMutation.isPending;

  if (isLoading) return <p className="p-6 font-mono text-[12px] text-ink-3">Đang tải bài tập…</p>;
  if (!exercise) return null;

  return (
    <div className="h-full grid lg:grid-cols-[minmax(280px,38%)_1fr] bg-bg min-h-0">
      {/* Đề bài */}
      <section className="min-h-0 overflow-y-auto border-r border-line p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-[18px] text-ink">{exercise.title}</h2>
          {exercise.solved && (
            <span className="flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">
              <Trophy className="w-3 h-3" /> Đã giải
            </span>
          )}
        </div>
        <div className={MARKDOWN_CLS}><ReactMarkdown>{exercise.descriptionMd}</ReactMarkdown></div>

        <p className="mt-5 mb-2 font-mono text-[10px] text-ink-3 uppercase tracking-widest">Ví dụ</p>
        <div className="space-y-2">
          {exercise.publicTests.map((t) => (
            <div key={t.index} className="font-mono text-[12px] bg-bg-2 rounded-lg px-3 py-2">
              <span className="text-ink-3">{exercise.functionName}(</span>
              <span className="text-ink">{t.input}</span>
              <span className="text-ink-3">) → </span>
              <span className="text-accent">{t.expected}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-ink-3">
          + {exercise.hiddenCount} test ẩn khi nộp bài · giới hạn {exercise.timeLimitMs} ms / test · đã nộp {exercise.attempts} lần
        </p>
      </section>

      {/* Editor + kết quả */}
      <section className="min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-bg-1">
          <span className="font-mono text-[11px] text-ink-3">solution.js</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (window.confirm('Khôi phục code mẫu? Code hiện tại sẽ mất.')) handleChange(exercise.starterCode ?? ''); }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11.5px] text-ink-3 hover:text-ink hover:bg-bg-2"
              title="Khôi phục code mẫu">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" variant="ghost" onClick={() => runMutation.mutate()} disabled={busy}>
              <Play className="w-3.5 h-3.5" /> {runMutation.isPending ? 'Đang chạy…' : 'Chạy thử'}
            </Button>
            <Button size="sm" onClick={() => submitMutation.mutate()} disabled={busy}>
              <Send className="w-3.5 h-3.5" /> {submitMutation.isPending ? 'Đang chấm…' : 'Nộp bài'}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-[220px] overflow-hidden">
          <Suspense fallback={<p className="p-4 font-mono text-[12px] text-ink-3">Đang tải editor…</p>}>
            <CodeEditor value={code} onChange={handleChange} />
          </Suspense>
        </div>

        <div className="max-h-[45%] overflow-y-auto border-t border-line p-3">
          {result
            ? <ExerciseResults result={result} title={label} />
            : <p className="font-mono text-[11.5px] text-ink-3">// "Chạy thử" chạy các ví dụ · "Nộp bài" chấm cả test ẩn</p>}
        </div>
      </section>
    </div>
  );
}
