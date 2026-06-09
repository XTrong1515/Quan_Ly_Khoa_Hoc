import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, BookOpen, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { cn } from '@/lib/utils';

function useEnrollments(status) {
  return useQuery({
    queryKey: ['enrollments', status ?? 'all'],
    queryFn: () =>
      api.get('/api/enrollments/me', { params: status ? { status } : {} }).then(r => r.data),
    staleTime: 60_000,
  });
}

export default function MyLearningPage() {
  const [tab, setTab] = useState('all');
  const apiStatus = tab === 'all' ? undefined : tab;
  const { data, isLoading, isError } = useEnrollments(apiStatus);
  const enrollments = data?.enrollments ?? [];

  const inProgress = tab === 'all'
    ? enrollments.filter(e => e.progress_percent < 100)
    : (tab === 'in_progress' ? enrollments : []);
  const completed = tab === 'all'
    ? enrollments.filter(e => e.progress_percent >= 100)
    : (tab === 'completed' ? enrollments : []);

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      <h1 className="display text-[32px] mb-1">Học tập của tôi</h1>
      <p className="text-ink-2 text-[14px] mb-7">Các khóa học bạn đã đăng ký</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line mb-8">
        {[
          { key: 'all',         label: 'Tất cả' },
          { key: 'in_progress', label: 'Đang học' },
          { key: 'completed',   label: 'Hoàn thành' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2',
            )}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <div className="py-16 text-center">
          <p className="font-mono text-ink-3">// Không thể tải danh sách khóa học</p>
        </div>
      )}

      {!isLoading && !isError && enrollments.length === 0 && <EmptyState />}

      {!isLoading && !isError && (inProgress.length > 0 || completed.length > 0) && (
        <>
          {inProgress.length > 0 && (
            <section className="mb-10">
              {tab === 'all' && (
                <h2 className="font-semibold text-[14px] text-ink mb-4 flex items-center gap-2">
                  <Play className="w-4 h-4 text-accent fill-accent" />
                  Đang học ({inProgress.length})
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {inProgress.map(e => <EnrollmentCard key={e.id} enrollment={e} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              {tab === 'all' && (
                <h2 className="font-semibold text-[14px] text-ink mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Hoàn thành ({completed.length})
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map(e => <EnrollmentCard key={e.id} enrollment={e} isCompleted />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ── Enrollment card ──────────────────────────────────────────── */
function EnrollmentCard({ enrollment: e, isCompleted }) {
  const course = {
    glyph: e.glyph,
    thumb: e.thumb,
    tag:   null,
    lessons: e.total_lessons,
    hours: +(e.total_duration_minutes / 60).toFixed(1),
  };
  const href = e.nextLessonId
    ? `/learn/${e.courseId}/${e.nextLessonId}`
    : `/courses/${e.slug}`;

  return (
    <div className="card overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/courses/${e.slug}`}>
        <CourseThumb course={course} className="rounded-none" />
      </Link>
      <div className="p-4">
        <Link to={`/courses/${e.slug}`}
          className="font-semibold text-[14px] text-ink leading-snug hover:text-accent transition-colors line-clamp-2 mb-1.5 block">
          {e.title}
        </Link>
        <p className="font-mono text-[11.5px] text-ink-3 mb-3">{e.instructor_name}</p>

        <div className="mb-3">
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[11px] text-ink-3">Tiến độ</span>
            <span className="font-mono text-[11px] text-ink font-semibold">
              {Math.round(e.progress_percent)}%
            </span>
          </div>
          <Progress value={e.progress_percent} />
        </div>

        <div className="flex items-center gap-2 text-[11.5px] text-ink-3 font-mono mb-4">
          <Clock className="w-3.5 h-3.5" />
          {+(e.total_duration_minutes / 60).toFixed(1)}h
          <BookOpen className="w-3.5 h-3.5 ml-1" />
          {e.total_lessons} bài
        </div>

        <Link to={href}>
          <Button size="sm" className="w-full justify-center"
            variant={isCompleted ? 'ghost' : 'primary'}>
            {isCompleted
              ? <><CheckCircle className="w-3.5 h-3.5" /> Xem lại</>
              : <><Play className="w-3.5 h-3.5 fill-current" /> Tiếp tục học</>}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="py-20 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-bg-2 border border-line grid place-items-center mb-4">
        <BookOpen className="w-7 h-7 text-ink-3" />
      </div>
      <h3 className="font-semibold text-[16px] mb-1.5">Bạn chưa đăng ký khóa học nào</h3>
      <p className="text-ink-2 text-[13.5px] mb-6">Khám phá các khóa học và bắt đầu hành trình học tập!</p>
      <Link to="/courses"><Button>Khám phá khóa học</Button></Link>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-video bg-bg-3 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-bg-3 rounded w-3/4" />
        <div className="h-3 bg-bg-3 rounded w-1/2" />
        <div className="h-2 bg-bg-3 rounded w-full" />
        <div className="h-8 bg-bg-3 rounded w-full mt-2" />
      </div>
    </div>
  );
}
