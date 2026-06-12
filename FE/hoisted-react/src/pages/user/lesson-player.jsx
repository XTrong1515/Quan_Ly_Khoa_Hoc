import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import {
  ChevronDown, ChevronLeft, ChevronRight,
  CheckCircle, Check, Play, Paperclip, ListChecks,
  MessageSquare, Send, Edit2, Trash2, CornerDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';

const TABS = ['Tổng quan', 'Tài liệu', 'Ghi chú', 'Quiz', 'Thảo luận'];

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const playerRef     = useRef(null);
  const secondsRef    = useRef(0);   // current playback position for auto-save
  const didSeekRef    = useRef(false);
  const [tab, setTab] = useState('Tổng quan');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}`).then(r => r.data),
    staleTime: 0,
    retry: (failCount, err) => err?.response?.status !== 403 && failCount < 2,
  });

  const { data: quizData, refetch: refetchQuiz } = useQuery({
    queryKey: ['lesson-quiz', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}/quiz`).then(r => r.data),
    enabled: !isLoading && !isError,
    staleTime: 0,
  });

  // Redirect to course detail when user is not enrolled
  useEffect(() => {
    if (!isError) return;
    if (error?.response?.status === 403) {
      const courseSlug = error.response?.data?.courseSlug;
      toast.error('Bạn chưa đăng ký khóa học này');
      navigate(courseSlug ? `/courses/${courseSlug}` : '/courses', { replace: true });
    }
  }, [isError, error, navigate]);

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
    // Nudge to Quiz tab if quiz exists and not yet passed
    if (quizData?.quiz && !quizData.quiz.latestAttempt?.passed) {
      setTab('Quiz');
    }
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
            {TABS.map(t => {
              const hasQuizBadge = t === 'Quiz' && quizData?.quiz && !quizData.quiz.latestAttempt?.passed;
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={cn(
                    'relative px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                    tab === t
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                  )}>
                  {t}
                  {hasQuizBadge && (
                    <span className="absolute top-1.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
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

            {tab === 'Quiz' && (
              <QuizPanel
                quiz={quizData?.quiz ?? null}
                lessonId={lessonId}
                onPassed={() => {
                  refetchQuiz();
                  queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
                  queryClient.invalidateQueries({ queryKey: ['enrollments'] });
                }}
              />
            )}

            {tab === 'Thảo luận' && (
              <DiscussionPanel lessonId={lessonId} />
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

/* ── Quiz Panel ───────────────────────────────────────────────── */
function QuizPanel({ quiz, onPassed }) {
  const [answers,    setAnswers]   = useState({});
  const [result,     setResult]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying,   setRetrying]  = useState(false);

  if (!quiz) {
    return <p className="font-mono text-[13px] text-ink-3">// Bài học này chưa có quiz</p>;
  }

  const latestAttempt = quiz.latestAttempt;
  const showForm   = retrying || (!latestAttempt && !result);
  const showResult = result ?? (latestAttempt && !retrying ? latestAttempt : null);

  const handleSelect = (questionId, optionId) =>
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      toast.error('Vui lòng trả lời tất cả câu hỏi');
      return;
    }
    setSubmitting(true);
    try {
      const payload = quiz.questions.map(q => ({ questionId: q.id, optionId: answers[q.id] }));
      const { data } = await api.post(`/api/quizzes/${quiz.id}/attempt`, { answers: payload });
      setResult(data);
      setRetrying(false);
      setAnswers({});
      if (data.passed) onPassed();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally { setSubmitting(false); }
  };

  /* ── Result view ── */
  if (showResult) {
    const passed = showResult.passed ?? (showResult.score >= quiz.passScore);
    return (
      <div className="space-y-4">
        <div className={cn(
          'p-5 rounded-xl border text-center',
          passed ? 'border-success/40 bg-success/10' : 'border-line bg-bg-2',
        )}>
          <p className={cn('text-3xl font-bold mb-1', passed ? 'text-success' : 'text-ink')}>
            {showResult.score}%
          </p>
          <p className={cn('text-[13px] font-medium', passed ? 'text-success' : 'text-ink-2')}>
            {passed ? 'Đã qua quiz ✓' : `Chưa đạt — cần ${quiz.passScore}% để qua`}
          </p>
          {showResult.total != null && (
            <p className="font-mono text-[11px] text-ink-3 mt-1">
              {showResult.correct} / {showResult.total} câu đúng
            </p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setResult(null); setRetrying(true); setAnswers({}); }}
          className="w-full justify-center">
          Làm lại
        </Button>
      </div>
    );
  }

  /* ── Question form ── */
  return (
    <div className="space-y-5">
      {quiz.title && (
        <p className="font-semibold text-[14px] text-ink flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-accent shrink-0" />
          {quiz.title}
        </p>
      )}
      <p className="font-mono text-[11px] text-ink-3">
        // {quiz.questions.length} câu · đạt {quiz.passScore}% để hoàn thành bài học
      </p>

      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="space-y-2">
          <p className="text-[13.5px] font-medium text-ink">
            <span className="font-mono text-ink-3 mr-1.5">{qi + 1}.</span>
            {q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map(o => {
              const selected = answers[q.id] === o.id;
              return (
                <button key={o.id} onClick={() => handleSelect(q.id, o.id)}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 rounded-lg border text-[13px] transition-colors',
                    selected
                      ? 'border-accent bg-accent/10 text-ink font-medium'
                      : 'border-line bg-bg hover:border-accent/50 text-ink-2',
                  )}>
                  {o.text}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length < quiz.questions.length}
        className="w-full justify-center">
        {submitting ? 'Đang chấm...' : 'Nộp bài'}
      </Button>
    </div>
  );
}

/* ── Discussion Panel ────────────────────────────────────────── */
function DiscussionPanel({ lessonId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['discussions', lessonId];

  const { data, isLoading, fetchNextPage, hasNextPage } = useQuery({
    queryKey,
    queryFn: () => api.get(`/api/lessons/${lessonId}/discussions`).then(r => r.data),
    staleTime: 30_000,
  });

  const discussions = data?.discussions ?? [];
  const total       = data?.total ?? 0;

  const postMutation = useMutation({
    mutationFn: ({ content, parentId }) =>
      api.post(`/api/lessons/${lessonId}/discussions`, { content, parentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(apiMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/discussions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(apiMessage(err)),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => api.put(`/api/discussions/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] text-ink-3">
        // {total} bình luận
      </p>

      {/* New comment form */}
      <CommentForm
        placeholder="Viết bình luận..."
        onSubmit={(content) => postMutation.mutate({ content })}
        submitting={postMutation.isPending}
      />

      {isLoading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-bg-2 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && discussions.length === 0 && (
        <p className="font-mono text-[12px] text-ink-3 text-center py-6">
          // Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}

      {discussions.map(d => (
        <CommentItem
          key={d.id}
          comment={d}
          currentUserId={user?.id}
          onReply={(content) => postMutation.mutate({ content, parentId: d.id })}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={(id, content) => editMutation.mutate({ id, content })}
          replying={postMutation.isPending}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, currentUserId, onReply, onDelete, onEdit, replying }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const isOwn = comment.author.id === currentUserId;

  const avatar = comment.author.avatar;
  const initials = comment.author.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="space-y-3">
      {/* Main comment */}
      <div className="flex gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full grid place-items-center font-mono font-bold text-[11px] text-[#0B0F19] mt-0.5"
          style={{ background: avatar ? undefined : 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
          {avatar
            ? <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
            : initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[12.5px] text-ink">{comment.author.name}</span>
            <span className="font-mono text-[10px] text-ink-3">
              {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {editing ? (
            <CommentForm
              initialValue={comment.content}
              placeholder="Sửa bình luận..."
              onSubmit={(content) => { onEdit(comment.id, content); setEditing(false); }}
              onCancel={() => setEditing(false)}
              submitting={false}
            />
          ) : (
            <p className="text-[13px] text-ink-2 leading-relaxed">{comment.content}</p>
          )}

          {!editing && (
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => setShowReplyForm(v => !v)}
                className="font-mono text-[11px] text-ink-3 hover:text-accent transition-colors flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> Trả lời
              </button>
              {isOwn && (
                <>
                  <button onClick={() => setEditing(true)}
                    className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Sửa
                  </button>
                  <button onClick={() => onDelete(comment.id)}
                    className="font-mono text-[11px] text-ink-3 hover:text-danger transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Xóa
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-10 space-y-3 pl-3 border-l border-line">
          {comment.replies.map(r => {
            const rIsOwn    = r.author.id === currentUserId;
            const rInitials = r.author.name?.[0]?.toUpperCase() ?? '?';
            return (
              <div key={r.id} className="flex gap-2.5">
                <div className="shrink-0 w-6 h-6 rounded-full grid place-items-center font-mono font-bold text-[10px] text-[#0B0F19] mt-0.5"
                  style={{ background: r.author.avatar ? undefined : 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
                  {r.author.avatar
                    ? <img src={r.author.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    : rInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[12px] text-ink">{r.author.name}</span>
                    <span className="font-mono text-[10px] text-ink-3">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-2 leading-relaxed">{r.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply form */}
      {showReplyForm && (
        <div className="ml-10">
          <CommentForm
            placeholder="Viết câu trả lời..."
            onSubmit={(content) => { onReply(content); setShowReplyForm(false); }}
            onCancel={() => setShowReplyForm(false)}
            submitting={replying}
          />
        </div>
      )}
    </div>
  );
}

function CommentForm({ placeholder, initialValue = '', onSubmit, onCancel, submitting }) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    if (!initialValue) setValue('');
  };

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !value.trim()}
          className="flex items-center gap-1.5"
        >
          <Send className="w-3 h-3" />
          {submitting ? 'Đang gửi...' : 'Gửi'}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
        )}
        <span className="font-mono text-[10px] text-ink-3 ml-auto">Ctrl+Enter để gửi</span>
      </div>
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
