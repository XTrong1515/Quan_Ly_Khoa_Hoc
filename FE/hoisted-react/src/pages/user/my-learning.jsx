import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, BookOpen, Clock, TrendingUp, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { AccountShell } from '@/components/layout/account-shell.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
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

const TABS = [
  { key: 'all',         label: 'Tất cả' },
  { key: 'in_progress', label: 'Đang học' },
  { key: 'completed',   label: 'Hoàn thành' },
];

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

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + Number(e.progress_percent || 0), 0) / enrollments.length)
    : 0;

  const stats = tab === 'all' && enrollments.length > 0 ? [
    { icon: BookOpen,     n: enrollments.length,  l: 'Khóa học' },
    { icon: Play,         n: inProgress.length,   l: 'Đang học' },
    { icon: GraduationCap, n: completed.length,   l: 'Hoàn thành' },
    { icon: TrendingUp,   n: `${avgProgress}%`,   l: 'Tiến độ trung bình' },
  ] : null;

  return (
    <AccountShell title="Học tập của tôi" desc="Các khóa học bạn đã đăng ký">
      <Seo title="Học tập của tôi — Hoisted" />

      {/* Stats strip */}
      {stats && (
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {stats.map(({ icon: Icon, n, l }) => (
              <div key={l} className="card p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center flex-shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[20px] leading-none tabular-nums">{n}</div>
                  <div className="text-[11.5px] text-ink-3 mt-1">{l}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Segmented tabs */}
      <div className="flex gap-1 bg-bg-2 rounded-xl p-1 w-fit mb-7" role="tablist" aria-label="Lọc khóa học">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer',
              tab === key ? 'bg-bg-1 shadow-sm text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-2">Không thể tải danh sách khóa học. Vui lòng thử lại sau.</p>
        </div>
      )}

      {!isLoading && !isError && enrollments.length === 0 && <EmptyState />}

      {!isLoading && !isError && (inProgress.length > 0 || completed.length > 0) && (
        <>
          {inProgress.length > 0 && (
            <section className="mb-10" aria-label="Khóa học đang học">
              {tab === 'all' && (
                <h2 className="eyebrow mb-4 !text-[12px]">
                  <span className="text-accent">▸</span> Đang học ({inProgress.length})
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {inProgress.map((e, i) => (
                  <Reveal key={e.id} delay={(i % 3) * 50}>
                    <EnrollmentCard enrollment={e} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section aria-label="Khóa học đã hoàn thành">
              {tab === 'all' && (
                <h2 className="eyebrow mb-4 !text-[12px]">
                  <span className="text-success">✓</span> Hoàn thành ({completed.length})
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map((e, i) => (
                  <Reveal key={e.id} delay={(i % 3) * 50}>
                    <EnrollmentCard enrollment={e} isCompleted />
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AccountShell>
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
  const pct = Math.round(e.progress_percent);

  return (
    <div className="card h-full flex flex-col overflow-hidden group hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:shadow-lg hover:border-accent/30 transition-all duration-200">
      <Link to={`/courses/${e.slug}`} className="relative block">
        <CourseThumb course={course} className="rounded-none" />
        {isCompleted && (
          <span className="absolute top-3 right-3 flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-success text-[#0B0F19] font-mono text-[11px] font-bold shadow-lg">
            <CheckCircle className="w-3 h-3" aria-hidden="true" /> 100%
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link
          to={`/courses/${e.slug}`}
          className="font-display font-semibold text-[14.5px] text-ink leading-snug hover:text-accent transition-colors line-clamp-2 mb-1.5 block"
        >
          {e.title}
        </Link>
        <p className="font-mono text-[11.5px] text-ink-3 mb-4">{e.instructor_name}</p>

        <div className="mb-3">
          <div className="flex justify-between mb-1.5">
            <span className="font-mono text-[11px] text-ink-3">Tiến độ</span>
            <span className={cn('font-mono text-[11px] font-bold tabular-nums', isCompleted ? 'text-success' : 'text-accent')}>
              {pct}%
            </span>
          </div>
          <Progress value={e.progress_percent} />
        </div>

        <div className="flex items-center gap-3 text-[11.5px] text-ink-3 font-mono mb-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {+(e.total_duration_minutes / 60).toFixed(1)}h
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            {e.total_lessons} bài
          </span>
        </div>

        <Link to={href} className="mt-auto">
          <Button size="sm" className="w-full justify-center" variant={isCompleted ? 'ghost' : 'primary'}>
            {isCompleted
              ? <><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Xem lại</>
              : <><Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" /> Tiếp tục học</>}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="card relative overflow-hidden py-20 px-6 flex flex-col items-center text-center">
      <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-60" aria-hidden="true" />
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-5">
          <BookOpen className="w-7 h-7" aria-hidden="true" />
        </div>
        <h3 className="font-display font-bold text-[17px] mb-1.5">Bạn chưa đăng ký khóa học nào</h3>
        <p className="text-ink-2 text-[13.5px] mb-6">Khám phá các khóa học và bắt đầu hành trình học tập!</p>
        <Link to="/courses"><Button>Khám phá khóa học</Button></Link>
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse motion-reduce:animate-none">
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
