import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Play, Send, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';
import { ExerciseResults } from './exercise-results.jsx';

const CodeEditor = lazy(() => import('./code-editor.jsx'));

export const exerciseQueryKey = (lessonId) => ['lesson-exercise', String(lessonId)];

// Bản nháp gắn theo người dùng: chung máy thì người đăng nhập sau không thấy (và không nộp nhầm) code của người trước
const draftKey = (userId, exerciseId) => `hoisted.exercise.${userId ?? 'anon'}.${exerciseId}`;
const readDraft = (userId, id) => { try { return localStorage.getItem(draftKey(userId, id)); } catch { return null; } };
const writeDraft = (userId, id, code) => { try { localStorage.setItem(draftKey(userId, id), code); } catch { /* bỏ qua */ } };

const MARKDOWN_CLS = 'text-[13.5px] text-ink-2 leading-[1.7] [&_p]:mb-3 [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_h1]:font-display [&_h2]:font-display [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-bg-2 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:text-[12.5px] [&_pre_code]:bg-transparent [&_pre_code]:p-0';

/** Khung làm bài tập lập trình của học viên: đề bài | editor | kết quả chấm. */
export function ExerciseWorkspace({ lessonId, onSolved }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: exerciseQueryKey(lessonId),
    queryFn: () => api.get(`/api/lessons/${lessonId}/exercise`).then((r) => r.data),
  });
  const exercise = data?.exercise;
  const userId = useAuth((s) => s.user?.id);

  const [code, setCode]     = useState('');
  const [result, setResult] = useState(null);
  const [label, setLabel]   = useState('');
  const loadedFor = useRef(null);

  // Code ban đầu: bản nháp trên máy → bài nộp gần nhất → code mẫu
  useEffect(() => {
    if (!exercise || loadedFor.current === exercise.id) return;
    loadedFor.current = exercise.id;
    setCode(readDraft(userId, exercise.id) ?? exercise.lastSubmission?.code ?? exercise.starterCode ?? '');
    setResult(null);
  }, [exercise, userId]);

  const handleChange = (value) => {
    setCode(value);
    if (exercise) writeDraft(userId, exercise.id, value);
  };

  const runMutation = useMutation({
    mutationFn: () => api.post(`/api/lessons/${lessonId}/exercise/run`, { code }).then((r) => r.data),
    onSuccess: (res) => { setResult(res); setLabel('Chạy thử'); },
    onError: (err) => toast.error(apiMessage(err, 'Chưa chạy được code. Code của bạn vẫn còn — thử lại sau giây lát.')),
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
    onError: (err) => toast.error(apiMessage(err, 'Chưa nộp được bài. Code của bạn vẫn còn — thử lại sau giây lát.')),
  });

  const busy = runMutation.isPending || submitMutation.isPending;

  if (isLoading) return <p className="p-6 font-mono text-[12px] text-ink-3">Đang tải bài tập…</p>;
  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-ink-2 mb-3">Không tải được đề bài. Kiểm tra kết nối rồi thử lại.</p>
        <button type="button" onClick={() => refetch()} className="text-sm text-accent font-semibold hover:underline">Thử lại</button>
      </div>
    );
  }
  if (!exercise) return null;

  return (
    // Desktop: 2 cột cao bằng khung cha (mỗi cột tự cuộn). Điện thoại: xếp dọc theo dòng chảy trang, editor cao cố định
    <div className="flex flex-col lg:grid lg:h-full lg:grid-cols-[minmax(320px,40%)_1fr] bg-bg lg:min-h-0">
      {/* Đề bài */}
      <section className="lg:min-h-0 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-line p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display font-semibold text-[17px] leading-snug text-ink">{exercise.title}</h2>
          {exercise.solved && (
            <span className="flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-sm bg-success/15 text-success shrink-0">
              <Trophy className="w-3 h-3" /> Đã giải
            </span>
          )}
        </div>
        <div className={MARKDOWN_CLS}><ReactMarkdown>{exercise.descriptionMd}</ReactMarkdown></div>

        <h3 className="mt-5 mb-2 text-[13px] font-semibold text-ink">Ví dụ</h3>
        <div className="space-y-2">
          {exercise.publicTests.map((t) => (
            <div key={t.index} className="font-mono text-[12px] bg-bg-2 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
              <span className="text-ink-3">{exercise.functionName}(</span>
              <span className="text-ink">{t.input}</span>
              <span className="text-ink-3">) → </span>
              <span className="text-accent">{t.expected}</span>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-ink-3">Test ẩn</dt><dd className="text-ink-2 tabular-nums">{exercise.hiddenCount} test, chỉ chấm khi nộp bài</dd>
          <dt className="text-ink-3">Giới hạn</dt><dd className="text-ink-2 tabular-nums">{exercise.timeLimitMs} ms / test</dd>
          <dt className="text-ink-3">Đã nộp</dt><dd className="text-ink-2 tabular-nums">{exercise.attempts} lần</dd>
        </dl>
      </section>

      {/* Editor + kết quả */}
      <section className="lg:min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-bg-1">
          <span className="font-mono text-[11px] text-ink-3">solution.js</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (window.confirm('Thay code hiện tại bằng code mẫu ban đầu? Phần bạn đã viết sẽ bị xóa khỏi editor.')) handleChange(exercise.starterCode ?? ''); }}
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

        {/* Editor lấp đầy phần còn lại; nền editor kéo hết chiều cao thay vì dừng ở dòng code cuối */}
        <div className={cn('h-[360px] lg:h-auto lg:min-h-[200px] overflow-hidden', result ? 'lg:flex-[3]' : 'lg:flex-1')}>
          <Suspense fallback={<p className="p-4 font-mono text-[12px] text-ink-3">Đang tải editor…</p>}>
            <CodeEditor value={code} onChange={handleChange} className="h-full" />
          </Suspense>
        </div>

        {/* Kết quả: chỉ chiếm chỗ khi đã chạy / nộp */}
        <div className={cn('border-t border-line p-3 overflow-y-auto', result && 'lg:flex-[2] lg:min-h-0')}>
          {result
            ? <ExerciseResults result={result} title={label} />
            : <p className="font-mono text-[11.5px] text-ink-3">// "Chạy thử" chạy các ví dụ · "Nộp bài" chấm cả test ẩn</p>}
        </div>
      </section>
    </div>
  );
}
