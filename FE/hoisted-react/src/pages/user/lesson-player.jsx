import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import {
  ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, Check, Play, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['Tổng quan', 'Tài liệu', 'Ghi chú'];

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const playerRef     = useRef(null);
  const secondsRef    = useRef(0);   // current playback position for auto-save
  const didSeekRef    = useRef(false);
  const [tab, setTab] = useState('Tổng quan');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}`).then(r => r.data),
    staleTime: 0,
  });

  /* ── Auto-save progress every 10 s ── */
  useEffect(() => {
    didSeekRef.current = false;
    secondsRef.current = 0;
    const id = setInterval(() => {
      if (secondsRef.current > 0) {
        api.put(`/api/lesson-progress/${lessonId}`, {
          lastWatchedSeconds: Math.floor(secondsRef.current),
        }).catch(() => {});
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [lessonId]);

  /* ── Mark complete mutation ── */
  const completeMutation = useMutation({
    mutationFn: () => api.post(`/api/lesson-progress/${lessonId}/complete`),
    onSuccess: () => {
      toast.success('Đánh dấu hoàn thành!');
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  /* ── Download attachment ── */
  const handleDownload = async () => {
    try {
      const { data: d } = await api.get(`/api/lessons/${lessonId}/attachment`);
      window.open(d.url, '_blank');
    } catch (err) {
      toast.error(apiMessage(err, 'Không thể tải tài liệu'));
    }
  };

  /* ── Flat lesson list for prev/next ── */
  const allLessons = data?.sections?.flatMap(s => s.lessons) ?? [];
  const currentIdx = allLessons.findIndex(l => l.id === parseInt(lessonId, 10));
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const handleReady = () => {
    if (!didSeekRef.current && data?.progress?.lastWatchedSeconds > 5) {
      playerRef.current?.seekTo(data.progress.lastWatchedSeconds, 'seconds');
      didSeekRef.current = true;
    }
  };

  const handleEnded = () => {
    if (!data?.progress?.isCompleted) completeMutation.mutate();
  };

  /* ── Loading / error ── */
  if (isLoading) return <PlayerSkeleton />;
  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <p className="font-mono text-ink-3 mb-3">// Không tải được bài học</p>
          <Link to="/me"><Button variant="ghost">← Về My Learning</Button></Link>
        </div>
      </div>
    );
  }

  const { lesson, sections, progress } = data;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-bg shrink-0 min-h-[50px]">
        <Link to={`/courses/${lesson.courseSlug}`}
          className="font-mono text-[12px] text-ink-3 hover:text-ink transition-colors flex items-center gap-1 shrink-0 max-w-[200px] truncate">
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lesson.courseTitle}</span>
        </Link>

        <p className="flex-1 text-center font-semibold text-[13px] text-ink truncate px-2">
          {lesson.title}
        </p>

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" disabled={!prevLesson}
            onClick={() => prevLesson && navigate(`/learn/${courseId}/${prevLesson.id}`)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" disabled={!nextLesson}
            onClick={() => nextLesson && navigate(`/learn/${courseId}/${nextLesson.id}`)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left 70%: video + tabs */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* Video */}
          <div className="bg-black shrink-0" style={{ aspectRatio: '16/9', maxHeight: '58vh' }}>
            {lesson.videoUrl ? (
              <ReactPlayer
                ref={playerRef}
                url={lesson.videoUrl}
                width="100%" height="100%"
                controls
                onReady={handleReady}
                onProgress={({ playedSeconds }) => { secondsRef.current = playedSeconds; }}
                onEnded={handleEnded}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 grid place-items-center">
                  <Play className="w-8 h-8 text-white/30" />
                </div>
                <p className="font-mono text-[13px] text-white/40">Video chưa sẵn sàng</p>
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-line px-4 bg-bg shrink-0">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                  tab === t
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                )}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'Tổng quan' && (
              lesson.content
                ? <div
                    className="prose prose-sm max-w-none text-ink-2 [&_h3]:text-ink [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                : <p className="font-mono text-[13px] text-ink-3">// Bài học này chưa có mô tả</p>
            )}

            {tab === 'Tài liệu' && (
              lesson.hasAttachment
                ? (
                  <button onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-line rounded-lg text-[13.5px] font-medium hover:bg-bg-2 transition-colors text-ink">
                    <Paperclip className="w-4 h-4 text-accent" />
                    Tải tài liệu đính kèm
                  </button>
                )
                : <p className="font-mono text-[13px] text-ink-3">// Bài học không có tài liệu đính kèm</p>
            )}

            {tab === 'Ghi chú' && (
              <p className="font-mono text-[13px] text-ink-3">// Tính năng ghi chú sẽ ra mắt sớm</p>
            )}
          </div>
        </div>

        {/* Right 30%: curriculum sidebar */}
        <aside className="w-[30%] max-w-[360px] min-w-[240px] border-l border-line flex flex-col overflow-hidden shrink-0">
          {/* Mark complete button */}
          <div className="p-3 border-b border-line shrink-0">
            <Button
              size="sm"
              className="w-full justify-center"
              variant={progress.isCompleted ? 'ghost' : 'primary'}
              disabled={progress.isCompleted || completeMutation.isPending}
              onClick={() => completeMutation.mutate()}>
              {progress.isCompleted
                ? <><Check className="w-3.5 h-3.5" /> Đã hoàn thành</>
                : <><CheckCircle className="w-3.5 h-3.5" /> Đánh dấu hoàn thành</>}
            </Button>
          </div>

          {/* Curriculum accordion */}
          <div className="flex-1 overflow-y-auto">
            {sections.map(section => (
              <SidebarSection
                key={section.id}
                section={section}
                currentLessonId={parseInt(lessonId, 10)}
                courseId={courseId}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Sidebar section accordion ───────────────────────────────── */
function SidebarSection({ section, currentLessonId, courseId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(
    section.lessons.some(l => l.id === currentLessonId),
  );

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-2 hover:bg-bg-3 transition text-left gap-2">
        <span className="font-semibold text-[12.5px] text-ink line-clamp-2">{section.title}</span>
        <ChevronDown className={cn(
          'w-4 h-4 text-ink-3 shrink-0 transition-transform',
          open && 'rotate-180',
        )} />
      </button>

      {open && (
        <div>
          {section.lessons.map(l => {
            const isCurrent = l.id === currentLessonId;
            return (
              <button
                key={l.id}
                onClick={() => navigate(`/learn/${courseId}/${l.id}`)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-bg-2',
                  isCurrent && 'bg-bg-2 border-l-2 border-accent',
                )}>
                {l.isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-success shrink-0" />
                ) : (
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full border shrink-0',
                    isCurrent ? 'border-accent' : 'border-line',
                  )} />
                )}
                <span className={cn(
                  'flex-1 text-[12.5px] leading-snug text-left',
                  isCurrent ? 'text-ink font-medium' : 'text-ink-2',
                )}>
                  {l.title}
                </span>
                {l.durationMinutes > 0 && (
                  <span className="font-mono text-[11px] text-ink-3 shrink-0">
                    {l.durationMinutes}m
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function PlayerSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-bg animate-pulse">
      <div className="h-[50px] bg-bg-2 border-b border-line shrink-0" />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-bg-3" />
        <div className="w-[30%] max-w-[360px] border-l border-line bg-bg-2" />
      </div>
    </div>
  );
}
