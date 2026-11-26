import { useState, useRef, useEffect, useId, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  CheckCircle, Check, Paperclip, ListChecks,
  Send, Edit2, Trash2, CornerDownRight,
  PanelRightClose, PanelRightOpen, Heart,
  AlertTriangle, X, Code2, MonitorPlay,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Dialog } from '@/components/ui/dialog.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { RichContent } from '@/components/rich-content.jsx';
import { HlsPlayer, Mp4Player } from '@/components/video/hls-player.jsx';
import { LessonAssistant } from '@/components/ai/lesson-assistant.jsx';
import { Seo } from '@/components/seo.jsx';
import { api, apiMessage, BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';
import { useWishlistIds, useWishlistToggle } from '@/hooks/useWishlist';

const DESKTOP_MIN_WIDTH = 1024;
// Chiều cao dành cho phần dưới video (tiêu đề bài + thanh tab + vài dòng nội dung) → video không chiếm trọn
// màn hình, người học luôn thấy bài học còn nội dung bên dưới
const BELOW_VIDEO_PX = 236;

// Khung làm bài tập (kèm editor) chỉ tải khi bài học có bài tập
const ExerciseWorkspace = lazy(() =>
  import('@/components/exercise/exercise-workspace.jsx').then((m) => ({ default: m.ExerciseWorkspace })));

/* ── Watermark động trên video ────────────────────────────────── */
// Răn đe quay màn hình & truy vết người làm lộ: email người xem, mờ, đổi vị trí mỗi 20s.
const WATERMARK_SPOTS = [
  { top: '8%',  left: '6%'  }, { top: '12%', right: '8%' }, { top: '45%', left: '30%' },
  { bottom: '22%', right: '10%' }, { bottom: '18%', left: '8%' },
];
function VideoWatermark({ text }) {
  const [spot, setSpot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSpot(i => (i + 1 + Math.floor(Math.random() * 3)) % WATERMARK_SPOTS.length), 20_000);
    return () => clearInterval(id);
  }, []);
  if (!text) return null;
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-[5] overflow-hidden" aria-hidden="true">
      <span className="absolute font-mono text-[12px] text-white/25 whitespace-nowrap transition-all duration-1000"
        style={WATERMARK_SPOTS[spot]}>
        {text}
      </span>
    </div>
  );
}

/* ── Reusable warning modal ───────────────────────────────────── */
function WarningModal({ icon: Icon = AlertTriangle, title, children, onClose, actions }) {
  const titleId = useId();
  return (
    <Dialog onClose={onClose} aria-labelledby={titleId} className="max-w-[400px] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-sm border-2 border-edge bg-pop text-pop-ink grid place-items-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 pt-0.5">
            <h2 id={titleId} className="font-display font-semibold text-[15px] text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-ink-3 hover:text-ink transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5">{children}</div>

        <div className="flex gap-2 justify-end">
          {actions}
        </div>
    </Dialog>
  );
}

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const { user }      = useAuth();
  const playerRef     = useRef(null);
  const mainRef       = useRef(null);  // cột nội dung cuộn được
  const curriculumRef = useRef(null);
  const secondsRef    = useRef(0);   // current playback position for auto-save
  const resumeAtRef   = useRef(null); // vị trí phát tiếp sau khi xin lại link video hết hạn
  const lastRefreshRef = useRef(0);
  const didSeekRef    = useRef(false);
  const [hlsUnsupported, setHlsUnsupported] = useState(false); // không có MSE → phát MP4 dự phòng
  // Trên điện thoại danh sách bài học là lớp phủ → mặc định đóng để không che nội dung
  const [sidebarOpen, setSidebarOpen]   = useState(() => window.innerWidth >= DESKTOP_MIN_WIDTH);
  const sidebarToggleRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [quizBlockedModal, setQuizBlockedModal] = useState(false);
  const resizeDrag = useRef({ active: false, startX: 0, startW: 0 });

  function onResizeDown(e) {
    resizeDrag.current = { active: true, startX: e.clientX, startW: sidebarWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onResizeMove(e) {
    if (!resizeDrag.current.active) return;
    const delta = resizeDrag.current.startX - e.clientX;
    setSidebarWidth(Math.max(220, Math.min(480, resizeDrag.current.startW + delta)));
  }
  function onResizeUp() { resizeDrag.current.active = false; }

  const numericCourseId = parseInt(courseId, 10);
  const { data: wishlistIds = [] } = useWishlistIds();
  const wishlistToggle = useWishlistToggle();
  const isWishlisted   = wishlistIds.includes(numericCourseId);

  const { data, isLoading, isError, error, refetch: refetchLesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}`).then(r => r.data),
    staleTime: 0,
    // Mỗi lần tải lại là 1 presigned URL mới → trình phát nạp lại video. Không refetch khi quay lại tab;
    // link hết hạn đã có handleVideoError (MP4) / HlsPlayer tự xử lý
    refetchOnWindowFocus: false,
    retry: (failCount, err) => err?.response?.status !== 403 && failCount < 2,
  });

  // Cùng query key với ExerciseWorkspace → dùng chung cache
  const { data: exerciseData } = useQuery({
    queryKey: ['lesson-exercise', String(lessonId)],
    queryFn: () => api.get(`/api/lessons/${lessonId}/exercise`).then(r => r.data),
    enabled: !isLoading && !isError,
  });
  const hasExercise = !!exerciseData?.exercise;
  const [view, setView] = useState(null); // 'video' | 'exercise' | 'quiz' — null = tự chọn
  useEffect(() => { setView(null); }, [lessonId]);

  const { data: quizData, refetch: refetchQuiz } = useQuery({
    queryKey: ['lesson-quiz', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}/quiz`).then(r => r.data),
    enabled: !isLoading && !isError,
    staleTime: 0,
  });

  // Bài có quiz / bài tập: đạt mới tính hoàn thành (BE trả 409 nếu bấm thẳng)
  const hasQuiz = !!quizData?.quiz?.questions?.length;
  const quizUnpassed = hasQuiz && !quizData.quiz.latestAttempt?.passed;
  const exerciseUnsolved = !!(exerciseData?.exercise && !exerciseData.exercise.solved);
  const completionLocked = quizUnpassed || exerciseUnsolved;
  const isStaffView = !!data?.staffView;
  // Giảng viên / admin xem thử không có lượt làm quiz nên không bị chặn chuyển bài
  const quizLocked = quizUnpassed && !isStaffView;

  // Mỗi loại nội dung là một khung xem; video luôn được ưu tiên hiện trước. done: false = phần bắt buộc chưa xong
  const views = [
    !!data?.lesson?.hasVideo && { id: 'video', label: 'Video', Icon: MonitorPlay },
    hasExercise && { id: 'exercise', label: 'Bài tập', Icon: Code2, done: !exerciseUnsolved },
    hasQuiz && { id: 'quiz', label: 'Quiz', Icon: ListChecks, done: !quizUnpassed },
  ].filter(Boolean);
  const mainView = views.find(v => v.id === view)?.id ?? views[0]?.id ?? null;

  // Đổi bài / đổi khung xem → về đầu cột nội dung
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [lessonId, mainView]);

  // Bài đang học luôn nằm trong vùng nhìn thấy của danh sách bài (khóa học dài)
  useEffect(() => {
    const list = curriculumRef.current;
    const current = list?.querySelector('[aria-current="page"]');
    if (!list || !current) return;
    const top = current.offsetTop;
    if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 40) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [lessonId, isLoading, sidebarOpen]);

  // Redirect to course detail when user is not enrolled
  useEffect(() => {
    if (!isError) return;
    if (error?.response?.status === 403) {
      const courseSlug = error.response?.data?.courseSlug;
      toast.error('Bạn cần mua hoặc đăng ký khóa học này để vào học.');
      navigate(courseSlug ? `/courses/${courseSlug}` : '/courses', { replace: true });
    }
  }, [isError, error, navigate]);

  const enrollmentRef = useRef(null);
  enrollmentRef.current = data?.enrollmentId ?? null;

  /* ── Auto-save progress every 10 s ── */
  useEffect(() => {
    didSeekRef.current = false;
    secondsRef.current = 0;
    const id = setInterval(() => {
      if (secondsRef.current > 0 && enrollmentRef.current) {
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
      toast.success('Đã đánh dấu bài học hoàn thành');
      queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu được trạng thái hoàn thành. Thử lại sau giây lát.')),
  });

  /* ── Download attachment ── */
  const handleDownload = async () => {
    const tabRef = window.open('', '_blank'); // mở ngay trong click → không bị chặn popup
    try {
      const { data: d } = await api.get(`/api/lessons/${lessonId}/attachment`);
      // Tab trống mở bằng window.open('') cùng origin với app: chỉ cho điều hướng tới http(s),
      // nếu không một link `javascript:` sẽ chạy với quyền của app (đọc được token).
      const url = new URL(d.url, window.location.href);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsafe attachment url');
      if (tabRef) { tabRef.opener = null; tabRef.location.href = url.href; } else window.location.assign(url.href);
    } catch (err) {
      tabRef?.close();
      toast.error(apiMessage(err, 'Không mở được tài liệu. Thử lại sau giây lát.'));
    }
  };

  /* ── Flat lesson list for prev/next ── */
  const allLessons = data?.sections?.flatMap(s => s.lessons) ?? [];
  const currentIdx = allLessons.findIndex(l => l.id === parseInt(lessonId, 10));
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const handleReady = () => {
    if (resumeAtRef.current !== null) {
      playerRef.current?.seekTo(resumeAtRef.current, 'seconds');
      resumeAtRef.current = null;
      didSeekRef.current = true;
      return;
    }
    if (!didSeekRef.current && data?.progress?.lastWatchedSeconds > 5) {
      playerRef.current?.seekTo(data.progress.lastWatchedSeconds, 'seconds');
      didSeekRef.current = true;
    }
  };

  // Link presigned hết hạn → lỗi khi tải tiếp → xin link mới và phát tiếp tại chỗ cũ (tối đa 1 lần / 10s)
  const handleVideoError = () => {
    if (data?.lesson?.videoSource !== 'storage') return;
    if (Date.now() - lastRefreshRef.current < 10_000) {
      toast.error('Video bị gián đoạn. Tải lại trang để phát tiếp gần chỗ bạn đang xem.');
      return;
    }
    lastRefreshRef.current = Date.now();
    resumeAtRef.current = secondsRef.current;
    refetchLesson();
  };

  const handleEnded = () => {
    if (data?.enrollmentId && !data?.progress?.isCompleted && !completionLocked) completeMutation.mutate();
    if (quizLocked) setView('quiz');
  };

  // Điện thoại / tablet: danh sách bài là lớp phủ → Esc đóng và trả focus về nút mở
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || window.innerWidth >= DESKTOP_MIN_WIDTH) return;
      setSidebarOpen(false);
      sidebarToggleRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const handleSelectLesson = (id) => {
    const target = allLessons.findIndex(l => l.id === id);
    if (quizLocked && target > currentIdx && !allLessons[target]?.isCompleted) {
      setQuizBlockedModal(true);
      return;
    }
    navigate(`/learn/${courseId}/${id}`);
    if (window.innerWidth < DESKTOP_MIN_WIDTH) setSidebarOpen(false);
  };

  const goNext = () => {
    if (!nextLesson) return;
    if (quizLocked) { setQuizBlockedModal(true); return; }
    navigate(`/learn/${courseId}/${nextLesson.id}`);
  };

  const openView = (v) => {
    setView(v);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuizPassed = () => {
    refetchQuiz();
    queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  /* ── Loading / error ── */
  if (isLoading) return <PlayerSkeleton />;
  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <div className="text-center px-5">
          <p className="font-display font-semibold text-[17px] text-ink mb-1.5">Không tải được bài học</p>
          <p className="text-sm text-ink-2 mb-5">
            {error?.response?.status === 404
              ? 'Bài học này không còn tồn tại hoặc đã được giảng viên gỡ.'
              : 'Có thể do mất kết nối hoặc máy chủ đang bận.'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {error?.response?.status !== 404 && <Button onClick={() => refetchLesson()}>Thử lại</Button>}
            <Link to="/me"><Button variant="ghost">← Về Học tập của tôi</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const { lesson, sections, progress } = data;
  const currentLessonId = parseInt(lessonId, 10);
  const currentSection = sections.find(s => s.lessons.some(l => l.id === currentLessonId));
  const doneCount = allLessons.filter(l => l.isCompleted).length;
  const coursePct = allLessons.length ? Math.round((doneCount / allLessons.length) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Seo title={`${lesson.title} — ${lesson.courseTitle} · Hoisted`} />
      {/* ── Top bar ── */}
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-[50px] border-b-2 border-edge bg-bg-1 shrink-0">
        <Link to={`/courses/${lesson.courseSlug}`}
          className="font-mono text-[12px] text-ink-3 hover:text-ink transition-colors flex items-center gap-1 min-w-0 flex-1 lg:flex-none lg:max-w-[220px]">
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lesson.courseTitle}</span>
        </Link>

        <p className="hidden lg:block flex-1 min-w-0 text-center font-semibold text-[13px] text-ink truncate px-2">
          {lesson.title}
        </p>

        {/* Bộ chuyển khung xem — luôn ở cùng một chỗ, kèm trạng thái phần bắt buộc */}
        {views.length > 1 && (
          <div role="tablist" aria-label="Nội dung bài học" className="flex shrink-0 rounded-lg border-2 border-edge bg-bg-1 p-0.5">
            {views.map(({ id, label, Icon, done }) => {
              const active = mainView === id;
              return (
                <button key={id} type="button" role="tab" aria-selected={active} onClick={() => setView(id)}
                  title={label}
                  className={cn(
                    'flex items-center gap-1.5 h-7 px-2 md:px-2.5 rounded-md text-[12px] font-medium transition-colors',
                    active ? 'bg-accent text-accent-ink press border-2 border-edge' : 'text-ink-2 hover:text-ink hover:bg-bg-2',
                  )}>
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="sr-only md:not-sr-only">{label}</span>
                  {done === true && <Check className={cn('w-3 h-3 shrink-0', !active && 'text-success')} aria-hidden="true" />}
                  {done === false && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', active ? 'bg-bg' : 'bg-warn')} aria-hidden="true" />}
                  {done !== undefined && <span className="sr-only">{done ? ' — đã xong' : ' — chưa xong'}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" disabled={!prevLesson} aria-label="Bài trước" title="Bài trước"
            onClick={() => prevLesson && navigate(`/learn/${courseId}/${prevLesson.id}`)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Bài sau" title="Bài sau" disabled={!nextLesson} onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <LessonAssistant lessonId={currentLessonId} lessonTitle={lesson.title} />

          {/* Wishlist toggle */}
          <button
            type="button"
            onClick={() => wishlistToggle.mutate({ courseId: numericCourseId, isWishlisted })}
            disabled={wishlistToggle.isPending}
            title={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
            className={cn(
              'hidden sm:grid w-8 h-8 rounded border-2 place-items-center transition-colors ml-1',
              isWishlisted
                ? 'border-danger/40 text-danger bg-danger/5 hover:bg-danger/10'
                : 'border-edge text-ink-3 hover:text-ink hover:bg-bg-2',
            )}
          >
            <Heart className={cn('w-4 h-4', isWishlisted && 'fill-danger')} />
          </button>

          <button
            type="button"
            ref={sidebarToggleRef}
            onClick={() => setSidebarOpen(v => !v)}
            title={sidebarOpen ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}
            aria-label={sidebarOpen ? 'Ẩn danh sách bài học' : 'Hiện danh sách bài học'}
            aria-expanded={sidebarOpen}
            className="w-8 h-8 rounded border-2 border-edge grid place-items-center text-ink-3 hover:text-ink hover:bg-bg-2 transition-colors ml-1"
          >
            {sidebarOpen
              ? <PanelRightClose className="w-4 h-4" />
              : <PanelRightOpen  className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative flex flex-1 min-h-0">
        {/* Cột nội dung: khung chính (video / bài tập / quiz) ở trên, thông tin + nội dung bài ngay bên dưới */}
        <div ref={mainRef} data-lesson-scroll className="flex-1 min-w-0 overflow-y-auto">
          {mainView === 'video' && (
            <div className="bg-black">
              <div className="relative mx-auto w-full aspect-video"
                style={{ maxWidth: `max(320px, calc((100vh - ${BELOW_VIDEO_PX}px) * 16 / 9))` }}
                onContextMenu={(e) => e.preventDefault()}>
                {lesson.hlsUrl && hlsUnsupported ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-white/40" aria-hidden="true" />
                    <p className="text-[14px] text-white/80 max-w-sm leading-relaxed">
                      Trình duyệt này chưa phát được video đã mã hóa. Hãy mở bằng Chrome, Edge, Firefox
                      hoặc Safari bản mới.
                    </p>
                  </div>
                ) : lesson.hlsUrl ? (
                  <HlsPlayer
                    ref={playerRef}
                    src={`${BASE_URL}${lesson.hlsUrl}`}
                    onReady={handleReady}
                    onError={() => toast.error('Video bị gián đoạn. Tải lại trang để phát tiếp gần chỗ bạn đang xem.')}
                    onUnsupported={() => setHlsUnsupported(true)}
                    onProgress={({ playedSeconds }) => { secondsRef.current = playedSeconds; }}
                    onEnded={handleEnded}
                  />
                ) : (
                  // Video vừa tải lên, đang mã hóa HLS → tạm phát MP4 qua link có hạn
                  <Mp4Player
                    ref={playerRef}
                    src={lesson.videoUrl}
                    onReady={handleReady}
                    onError={handleVideoError}
                    onProgress={({ playedSeconds }) => { secondsRef.current = playedSeconds; }}
                    onEnded={handleEnded}
                  />
                )}
                <VideoWatermark text={user?.email ? `${user.email} · #${user.id}` : null} />
              </div>
            </div>
          )}

          {mainView === 'exercise' && (
            // Desktop: khung làm bài lấp đầy màn hình, chừa dải tiêu đề bài học ở đáy để biết còn nội dung bên dưới
            <div className="border-b border-line lg:h-[calc(100vh-50px-76px)] lg:min-h-[520px]">
              <Suspense fallback={<p className="p-6 font-mono text-[12px] text-ink-3">Đang tải bài tập…</p>}>
                <ExerciseWorkspace
                  lessonId={lessonId}
                  onSolved={() => {
                    queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
                    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
                  }}
                />
              </Suspense>
            </div>
          )}

          {mainView === 'quiz' && (
            <div className="border-b border-line px-4 sm:px-6 pt-5">
              <QuizPanel
                key={quizData.quiz.id}
                quiz={quizData.quiz}
                mode={isStaffView ? 'staff' : quizUnpassed ? 'locked' : 'passed'}
                onPassed={handleQuizPassed}
              />
            </div>
          )}

          <LessonDetails
            key={lessonId}
            lesson={lesson}
            lessonId={lessonId}
            sectionTitle={currentSection?.title}
            position={currentIdx + 1}
            total={allLessons.length}
            isCompleted={progress.isCompleted}
            isStaffView={isStaffView}
            completionLocked={completionLocked}
            quizUnpassed={quizUnpassed}
            completing={completeMutation.isPending}
            onComplete={() => completeMutation.mutate()}
            onOpenView={openView}
            onDownload={handleDownload}
            nextLesson={nextLesson}
            onNext={goNext}
          />
        </div>

        {/* Điện thoại / tablet: danh sách bài là lớp phủ → chạm ra ngoài để đóng */}
        {sidebarOpen && (
          <button type="button" aria-label="Đóng danh sách bài học" onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute inset-0 z-20 bg-black/50" />
        )}

        {/* Drag divider — resize sidebar width */}
        {sidebarOpen && (
          <div
            className="hidden lg:block w-[5px] shrink-0 cursor-col-resize hover:bg-accent/20 active:bg-accent/30 transition-colors touch-none"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={onResizeUp}
          />
        )}

        {/* Right: curriculum sidebar — toggleable + resizable */}
        <aside
          aria-label="Nội dung khóa học"
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          className={cn(
            'border-l-2 border-edge flex flex-col overflow-hidden shrink-0 transition-[width] duration-200 min-w-0 bg-bg-1',
            'max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:max-w-[85vw] max-lg:shadow-2xl',
            !sidebarOpen && 'invisible',
          )}>
          <div className="px-4 py-3 border-b border-line shrink-0">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-[13px] text-ink whitespace-nowrap">Nội dung khóa học</h2>
              <span className="font-mono text-[11.5px] text-ink-3 tabular-nums whitespace-nowrap">
                {doneCount}/{allLessons.length} bài · {coursePct}%
              </span>
            </div>
            <Progress value={coursePct} className="mt-2" />
          </div>

          <div ref={curriculumRef} className="relative flex-1 overflow-y-auto">
            {sections.map(section => (
              <SidebarSection
                key={section.id ?? 'none'}
                section={section}
                currentLessonId={currentLessonId}
                onSelect={handleSelectLesson}
              />
            ))}
          </div>
        </aside>
      </div>

      {/* ── Quiz blocked modal ── */}
      {quizBlockedModal && (
        <WarningModal
          title="Cần hoàn thành quiz trước"
          onClose={() => setQuizBlockedModal(false)}
          actions={
            <Button onClick={() => { setQuizBlockedModal(false); openView('quiz'); }}>
              Quay lại làm quiz
            </Button>
          }
        >
          <p className="text-sm text-ink-2 leading-[1.65]">
            Bài học này có quiz bắt buộc. Bạn phải đạt{' '}
            <strong className="text-ink">{quizData?.quiz?.passScore ?? 80}%</strong>{' '}
            trở lên để mở bài tiếp theo.
          </p>
        </WarningModal>
      )}
    </div>
  );
}

/* ── Thông tin + nội dung bài học (luôn hiển thị ngay dưới khung chính) ── */
function LessonDetails({
  lesson, lessonId, sectionTitle, position, total, isCompleted, isStaffView, completionLocked, quizUnpassed,
  completing, onComplete, onOpenView, onDownload, nextLesson, onNext,
}) {
  const [tab, setTab] = useState('overview');
  // Cùng query key với DiscussionPanel → chỉ để hiện số bình luận trên tab
  const { data: discussionData } = useQuery({
    queryKey: ['discussions', lessonId],
    queryFn: () => api.get(`/api/lessons/${lessonId}/discussions`).then(r => r.data),
    staleTime: 30_000,
  });
  const commentCount = discussionData?.total ?? 0;
  const tabs = [
    ['overview', 'Tổng quan'],
    ['discussion', commentCount ? `Thảo luận (${commentCount})` : 'Thảo luận'],
  ];

  let completion;
  if (isStaffView) {
    completion = (
      <span className="text-[12px] text-accent-ink ring-2 ring-inset ring-edge bg-accent rounded-md px-2.5 py-1.5">
        Chế độ xem của giảng viên / admin — không ghi tiến độ
      </span>
    );
  } else if (isCompleted) {
    completion = (
      <>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-success">
          <CheckCircle className="w-4 h-4" aria-hidden="true" /> Đã hoàn thành
        </span>
        {nextLesson && (
          <Button size="sm" onClick={onNext}>
            Bài tiếp theo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </>
    );
  } else if (completionLocked) {
    completion = (
      <Button size="sm" onClick={() => onOpenView(quizUnpassed ? 'quiz' : 'exercise')}>
        {quizUnpassed
          ? <><ListChecks className="w-3.5 h-3.5" /> Làm quiz để hoàn thành</>
          : <><Code2 className="w-3.5 h-3.5" /> Giải bài tập để hoàn thành</>}
      </Button>
    );
  } else {
    completion = (
      <Button size="sm" disabled={completing} onClick={onComplete}>
        <CheckCircle className="w-3.5 h-3.5" /> {completing ? 'Đang lưu…' : 'Đánh dấu hoàn thành'}
      </Button>
    );
  }

  return (
    <section aria-labelledby="lesson-title">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 sm:px-6 py-3.5 border-b border-line">
        <div className="min-w-0 flex-1 basis-[260px]">
          <h1 id="lesson-title" className="font-display font-semibold text-[18px] leading-snug text-ink text-balance">
            {lesson.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-3">
            {sectionTitle && <><span>{sectionTitle}</span><span aria-hidden="true">·</span></>}
            <span className="tabular-nums">Bài {position}/{total}</span>
            {lesson.durationMinutes > 0 && (
              <><span aria-hidden="true">·</span><span className="tabular-nums">{lesson.durationMinutes} phút</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lesson.hasAttachment && (
            <Button size="sm" variant="ghost" onClick={onDownload} title="Mở tài liệu đính kèm" className="max-w-[240px]">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lesson.attachmentName || 'Tài liệu đính kèm'}</span>
            </Button>
          )}
          {completion}
        </div>
      </div>

      <div role="tablist" aria-label="Thông tin bài học"
        className="sticky top-0 z-10 flex gap-1 px-4 sm:px-6 border-b border-line bg-bg">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn(
              'px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              tab === id ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink-2',
            )}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-6 py-5 pb-10">
        {tab === 'overview' ? (
          lesson.content
            ? <RichContent content={lesson.content} className="max-w-3xl" />
            : <p className="font-mono text-[13px] text-ink-3">// Bài học này chưa có nội dung văn bản</p>
        ) : (
          <div className="max-w-3xl">
            <DiscussionPanel lessonId={lessonId} canModerate={isStaffView} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Sidebar section accordion ───────────────────────────────── */
function SidebarSection({ section, currentLessonId, onSelect }) {
  const hasCurrent = section.lessons.some(l => l.id === currentLessonId);
  const [open, setOpen] = useState(hasCurrent);
  // Chuyển sang bài thuộc phần khác → tự mở phần đó
  useEffect(() => { if (hasCurrent) setOpen(true); }, [hasCurrent]);
  const done = section.lessons.filter(l => l.isCompleted).length;

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg-1 hover:bg-bg-2 transition-colors text-left">
        <span className="flex-1 min-w-0 font-semibold text-[12.5px] text-ink line-clamp-2">{section.title}</span>
        <span className="font-mono text-[11px] text-ink-3 tabular-nums shrink-0">{done}/{section.lessons.length}</span>
        <ChevronDown className={cn('w-4 h-4 text-ink-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul>
          {section.lessons.map(l => {
            const isCurrent = l.id === currentLessonId;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => onSelect(l.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-4 py-2 text-left transition-colors',
                    isCurrent ? 'bg-accent/10' : 'hover:bg-bg-2',
                  )}>
                  {l.isCompleted ? (
                    <Check className="w-3.5 h-3.5 mt-[2px] text-success shrink-0" aria-label="Đã hoàn thành" />
                  ) : isCurrent ? (
                    <span className="w-3.5 h-3.5 mt-[2px] rounded-full border-2 border-accent grid place-items-center shrink-0" aria-hidden="true">
                      <span className="w-1 h-1 rounded-full bg-accent" />
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 mt-[2px] rounded-full border border-ink-3 shrink-0" aria-hidden="true" />
                  )}
                  <span className={cn(
                    'flex-1 min-w-0 text-[12.5px] leading-snug',
                    isCurrent ? 'text-ink font-semibold' : 'text-ink-2',
                  )}>
                    {l.title}
                  </span>
                  {l.durationMinutes > 0 && (
                    <span className="font-mono text-[11px] text-ink-3 tabular-nums shrink-0">
                      {l.durationMinutes}m
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── Quiz Panel ───────────────────────────────────────────────── */
const QUIZ_MODE = {
  staff:  { text: 'Xem trước — kết quả không được lưu', cls: 'bg-accent text-accent-ink ring-2 ring-inset ring-edge' },
  locked: { text: 'Bắt buộc để hoàn thành bài học',     cls: 'bg-warn/15 text-warn' },
  passed: { text: 'Đã đạt',                              cls: 'bg-success/15 text-success' },
};

function QuizPanel({ quiz, mode = 'locked', onPassed }) {
  const [answers,          setAnswers]         = useState({});
  const [result,           setResult]          = useState(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [retrying,         setRetrying]         = useState(false);
  const [unansweredModal,  setUnansweredModal]  = useState(false);
  const [retryAt,          setRetryAt]          = useState(null); // mốc được làm lại sau lần chưa đạt
  const [now,              setNow]              = useState(() => Date.now());

  useEffect(() => {
    setRetryAt(quiz?.retryAfterSeconds > 0 ? Date.now() + quiz.retryAfterSeconds * 1000 : null);
  }, [quiz?.id, quiz?.retryAfterSeconds]);

  useEffect(() => {
    if (!retryAt) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [retryAt]);

  if (!quiz) {
    return <p className="font-mono text-[13px] text-ink-3">// Bài học này chưa có quiz</p>;
  }

  const waitSeconds = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;

  const latestAttempt = quiz.latestAttempt;
  const showResult = result ?? (latestAttempt && !retrying ? latestAttempt : null);
  const modeInfo = QUIZ_MODE[mode] ?? QUIZ_MODE.locked;

  // answers[questionId] luôn là mảng optionId; câu nhiều đáp án bật / tắt từng lựa chọn
  const handleSelect = (question, optionId) =>
    setAnswers(prev => {
      const current = prev[question.id] ?? [];
      if (question.type !== 'multiple') return { ...prev, [question.id]: [optionId] };
      const next = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId];
      return { ...prev, [question.id]: next };
    });

  const handleSubmit = async () => {
    if (quiz.questions.some(q => !answers[q.id]?.length)) {
      setUnansweredModal(true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = quiz.questions.map(q => ({ questionId: q.id, optionIds: answers[q.id] }));
      const { data } = await api.post(`/api/quizzes/${quiz.id}/attempt`, { answers: payload });
      setResult(data);
      setRetrying(false);
      setAnswers({});
      if (data.retryAfterSeconds) setRetryAt(Date.now() + data.retryAfterSeconds * 1000);
      if (data.passed) onPassed();
    } catch (err) {
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      if (retryAfter) setRetryAt(Date.now() + retryAfter * 1000);
      toast.error(apiMessage(err, 'Chưa nộp được quiz. Câu trả lời vẫn được giữ — thử nộp lại.'));
    } finally { setSubmitting(false); }
  };

  const header = (
    <div className="max-w-5xl flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-4">
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[17px] leading-snug text-ink">{quiz.title || 'Quiz'}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          {quiz.questions.length} câu · cần đạt {quiz.passScore}% để hoàn thành bài học
        </p>
      </div>
      <span className={cn('shrink-0 rounded-sm px-2.5 py-1 text-[11.5px] font-medium', modeInfo.cls)}>
        {modeInfo.text}
      </span>
    </div>
  );

  /* ── Result view ── */
  if (showResult) {
    const passed = showResult.passed ?? (showResult.score >= quiz.passScore);
    return (
      <div className="pb-5">
        {header}
        <div className={cn(
          'max-w-5xl flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border-2 px-5 py-4',
          passed ? 'border-success/40 bg-success/10' : 'border-edge bg-bg-1',
        )}>
          <p className={cn('font-display text-[32px] font-bold leading-none tabular-nums', passed ? 'text-success' : 'text-ink')}>
            {showResult.score}%
          </p>
          <div className="flex-1 min-w-[180px]">
            <p className={cn('flex items-center gap-1.5 text-[14px] font-semibold', passed ? 'text-success' : 'text-ink')}>
              {passed && <Check className="w-4 h-4" aria-hidden="true" />}
              {passed ? 'Đã qua quiz' : `Chưa đạt — cần ${quiz.passScore}% để qua`}
            </p>
            {showResult.total != null && (
              <p className="mt-0.5 font-mono text-[12px] text-ink-3 tabular-nums">
                {showResult.correct} / {showResult.total} câu đúng
              </p>
            )}
          </div>
          <Button size="sm" variant="ghost"
            disabled={!passed && waitSeconds > 0}
            onClick={() => { setResult(null); setRetrying(true); setAnswers({}); }}>
            {passed ? 'Làm lại quiz' : waitSeconds > 0 ? `Làm lại sau ${waitSeconds} giây` : 'Làm lại để đạt'}
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = quiz.questions.filter(q => answers[q.id]?.length).length;

  /* ── Question form ── */
  return (
    <div>
      {header}

      <ol className="max-w-5xl space-y-5">
        {quiz.questions.map((q, qi) => {
          const multiple = q.type === 'multiple';
          const labelId = `quiz-q-${q.id}`;
          return (
            <li key={q.id}>
              <div id={labelId} className="flex gap-1.5">
                <span className="font-mono text-[14px] text-ink-3 leading-snug shrink-0">{qi + 1}.</span>
                <div className="min-w-0 flex-1">
                  <RichContent content={q.question} className="text-[14px] font-medium text-ink leading-snug [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:text-[12.5px] [&_pre]:leading-[1.6]" />
                  {multiple && <span className="text-[12px] font-normal text-accent">(chọn tất cả đáp án đúng)</span>}
                </div>
              </div>
              <div role={multiple ? 'group' : 'radiogroup'} aria-labelledby={labelId}
                className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.options.map(o => {
                  const selected = !!answers[q.id]?.includes(o.id);
                  return (
                    <button key={o.id} type="button" role={multiple ? 'checkbox' : 'radio'} aria-checked={selected}
                      onClick={() => handleSelect(q, o.id)}
                      className={cn(
                        'flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg border-2 text-[13px] leading-snug transition-colors',
                        selected
                          ? 'border-accent bg-accent/10 text-ink'
                          : 'border-edge bg-bg hover:border-accent hover:bg-bg-1 text-ink-2',
                      )}>
                      <span aria-hidden="true" className={cn(
                        'mt-[2px] w-3.5 h-3.5 shrink-0 border grid place-items-center',
                        multiple ? 'rounded-[3px]' : 'rounded-full',
                        selected ? 'border-accent bg-accent' : 'border-ink-3',
                      )}>
                        {selected && (multiple
                          ? <Check className="w-2.5 h-2.5 text-bg" strokeWidth={3} />
                          : <span className="w-1.5 h-1.5 rounded-full bg-bg" />)}
                      </span>
                      <span className="min-w-0 break-words">{o.text}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Thanh nộp bài dính đáy khi cuộn — luôn thấy số câu đã trả lời */}
      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 mt-5 px-4 sm:px-6 py-3 border-t border-line bg-bg">
        <div className="max-w-5xl flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-3 tabular-nums">
            Đã trả lời <span className="text-ink font-semibold">{answeredCount}/{quiz.questions.length}</span> câu
          </p>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang chấm…' : 'Nộp quiz'}
          </Button>
        </div>
      </div>

      {/* Unanswered questions modal */}
      {unansweredModal && (() => {
        const unanswered = quiz.questions
          .map((q, i) => ({ idx: i + 1, q }))
          .filter(({ q }) => !answers[q.id]?.length);
        return (
          <WarningModal
            title="Bạn chưa trả lời hết câu hỏi"
            onClose={() => setUnansweredModal(false)}
            actions={
              <Button onClick={() => setUnansweredModal(false)}>
                Quay lại làm bài
              </Button>
            }
          >
            <p className="text-sm text-ink-2 mb-3">
              Còn <strong className="text-ink">{unanswered.length}</strong> câu chưa được trả lời:
            </p>
            <ul className="space-y-1.5">
              {unanswered.map(({ idx, q }) => (
                <li key={q.id} className="flex items-start gap-2 text-sm text-ink-2">
                  <span className="font-mono text-accent shrink-0">#{idx}</span>
                  <span className="line-clamp-2">{q.question}</span>
                </li>
              ))}
            </ul>
          </WarningModal>
        );
      })()}
    </div>
  );
}

/* ── Discussion Panel ────────────────────────────────────────── */
function DiscussionPanel({ lessonId, canModerate }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['discussions', lessonId];

  const { data, isLoading } = useQuery({
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
    onError: (err) => toast.error(apiMessage(err, 'Chưa gửi được bình luận. Thử lại sau giây lát.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/discussions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(apiMessage(err, 'Chưa xóa được bình luận. Thử lại sau giây lát.')),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => api.put(`/api/discussions/${id}`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err) => toast.error(apiMessage(err, 'Chưa lưu được chỉnh sửa. Thử lại sau giây lát.')),
  });

  return (
    <div className="space-y-5">
      <p className="font-mono text-[11px] text-ink-3">
        // {total} bình luận
      </p>

      {/* New comment form */}
      <CommentForm
        placeholder="Hỏi giảng viên hoặc chia sẻ với học viên khác…"
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
          canModerate={canModerate}
          onReply={(content) => postMutation.mutate({ content, parentId: d.id })}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={(id, content) => editMutation.mutate({ id, content })}
          replying={postMutation.isPending}
        />
      ))}
    </div>
  );
}

function CommentItem({ comment, currentUserId, canModerate, onReply, onDelete, onEdit, replying }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const isOwn = comment.author.id === currentUserId;

  const avatar = comment.author.avatar;
  const initials = comment.author.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="space-y-3">
      {/* Main comment */}
      <div className="flex gap-3">
        <div className="shrink-0 w-7 h-7 rounded-sm border-2 border-edge grid place-items-center font-mono font-bold text-[11px] text-navy mt-0.5"
          style={{ background: avatar ? undefined : 'rgb(var(--pop))' }}>
          {avatar
            ? <img src={avatar} alt="" className="w-7 h-7 rounded-sm object-cover border-2 border-edge" />
            : initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-[12.5px] text-ink">{comment.author.name}</span>
            <span className="font-mono text-[11px] text-ink-3">
              {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {editing ? (
            <CommentForm
              initialValue={comment.content}
              placeholder="Sửa bình luận…"
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
                <button onClick={() => setEditing(true)}
                  className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Sửa
                </button>
              )}
              {(isOwn || canModerate) && (
                <button onClick={() => window.confirm('Xóa bình luận này? Mọi câu trả lời bên dưới cũng bị xóa theo.') && onDelete(comment.id)}
                  className="font-mono text-[11px] text-ink-3 hover:text-danger transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Xóa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-10 space-y-3 pl-3 border-l border-line">
          {comment.replies.map(r => {
            const rInitials = r.author.name?.[0]?.toUpperCase() ?? '?';
            return (
              <div key={r.id} className="flex gap-2.5">
                <div className="shrink-0 w-6 h-6 rounded-sm border-2 border-edge grid place-items-center font-mono font-bold text-[11px] text-navy mt-0.5"
                  style={{ background: r.author.avatar ? undefined : 'rgb(var(--pop))' }}>
                  {r.author.avatar
                    ? <img src={r.author.avatar} alt="" className="w-6 h-6 rounded-sm object-cover border-2 border-edge" />
                    : rInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[12px] text-ink">{r.author.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">
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
            placeholder="Viết câu trả lời…"
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
        className="w-full px-3 py-2 text-[13px] bg-bg-3 border-2 border-edge rounded-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none"
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
          {submitting ? 'Đang gửi…' : 'Gửi'}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
        )}
        <span className="font-mono text-[11px] text-ink-3 ml-auto">Ctrl+Enter để gửi</span>
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
        <div className="flex-1 min-w-0">
          <div className="w-full aspect-video max-h-[calc(100vh-286px)] bg-bg-3" />
          <div className="px-6 py-4 space-y-2">
            <div className="h-5 w-1/2 rounded bg-bg-2" />
            <div className="h-3 w-1/4 rounded bg-bg-2" />
          </div>
        </div>
        <div className="hidden lg:block w-[320px] border-l border-line bg-bg-1" />
      </div>
    </div>
  );
}
