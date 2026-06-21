import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, ArrowRight, CheckCircle2, Search, Star,
  ChevronRight, Clock, Award, Users, BookOpen,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CourseCard } from '@/components/course-card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { api } from '@/lib/api';
import { COURSES, CATEGORIES } from '@/data/courses';

function useHomeData() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => api.get('/api/home').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

function CourseSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-3 animate-pulse">
          <div className="aspect-video rounded-[10px] bg-bg-3 mb-3" />
          <div className="px-1 pb-2 space-y-2">
            <div className="h-3 bg-bg-3 rounded w-full" />
            <div className="h-3 bg-bg-3 rounded w-2/3" />
            <div className="h-2.5 bg-bg-3 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

const STATS = [
  { n: '12.000+', l: 'Học viên đang học' },
  { n: '4.86 / 5', l: 'Đánh giá trung bình' },
  { n: '18', l: 'Instructor thực chiến' },
  { n: '120h+', l: 'Nội dung video' },
];

const INSTRUCTORS = [
  { name: 'Will Sentance',  role: 'Senior Eng @ Codesmith',      courses: 3, students: '12k+', avatar: 'WS', bg: 'bg-yellow-100 dark:bg-yellow-900/30', fg: 'text-yellow-700 dark:text-yellow-400' },
  { name: 'Khang Phạm',    role: 'React Contributor',            courses: 2, students: '8k+',  avatar: 'KP', bg: 'bg-indigo-100 dark:bg-indigo-900/30', fg: 'text-indigo-700 dark:text-indigo-400' },
  { name: 'Lina Trần',     role: 'Senior FE @ VinAI',            courses: 4, students: '14k+', avatar: 'LT', bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-700 dark:text-emerald-400' },
  { name: 'Đặng Quang',    role: 'Staff Eng @ Momo',             courses: 2, students: '9k+',  avatar: 'ĐQ', bg: 'bg-sky-100 dark:bg-sky-900/30', fg: 'text-sky-700 dark:text-sky-400' },
  { name: 'Mike Hughes',   role: 'Node.js Core Contributor',     courses: 1, students: '4k+',  avatar: 'MH', bg: 'bg-rose-100 dark:bg-rose-900/30', fg: 'text-rose-700 dark:text-rose-400' },
  { name: 'Hà Trang',      role: 'Lead Dev @ Tiki',              courses: 3, students: '22k+', avatar: 'HT', bg: 'bg-violet-100 dark:bg-violet-900/30', fg: 'text-violet-700 dark:text-violet-400' },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const POPULAR_TERMS = ['Event Loop', 'React Hooks', 'TypeScript', 'Node.js', 'Closure'];

const COURSE_TABS = ['Phổ biến nhất', 'Mới nhất', 'Miễn phí'];

const LEARNING_PATHS = [
  {
    level: '01', tag: 'Người mới bắt đầu',
    title: 'JavaScript Cơ Bản → Nâng Cao',
    desc: 'Từ var/let/const đến closure, prototype chain, async/await. Nền tảng vững cho mọi con đường.',
    steps: ['JS Core (20h)', 'DOM & Events (12h)', 'Async Patterns (18h)'],
    time: '~50 giờ',
    color: 'text-success', border: 'border-success/25', bg: 'bg-success/5',
  },
  {
    level: '02', tag: 'Đang đi làm',
    title: 'React & Node Thực Chiến',
    desc: 'React internals, state management, SSR, REST API và deployment thực tế.',
    steps: ['React Internals (24h)', 'Node Runtime (16h)', 'Full-stack Deploy (10h)'],
    time: '~50 giờ',
    color: 'text-accent', border: 'border-accent/25', bg: 'bg-accent/5',
  },
  {
    level: '03', tag: 'Senior / Lead',
    title: 'Kiến Trúc & Hiệu Năng',
    desc: 'System design, micro-frontend, performance profiling, CI/CD — tư duy kiến trúc hệ thống.',
    steps: ['System Design (20h)', 'Micro-frontend (14h)', 'Perf & DevOps (16h)'],
    time: '~50 giờ',
    color: 'text-violet-500', border: 'border-violet-500/25', bg: 'bg-violet-500/5',
  },
];

export default function HomePage() {
  const { data, isLoading } = useHomeData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const categories = data?.categories ?? CATEGORIES;
  const allCourses  = data?.featured   ?? COURSES;

  const visibleCourses = (() => {
    if (activeTab === 2) return allCourses.filter((c) => c.price === 0);
    if (activeTab === 1) return [...allCourses].sort((a, b) => b.id - a.id).slice(0, 4);
    return [...allCourses].sort((a, b) => b.students - a.students).slice(0, 4);
  })();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/courses?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="px-16 pt-8 pb-6">

        {/* Social-proof trust bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex -space-x-2">
            {['MT', 'HD', 'TH', 'KP', 'LT'].map((init, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-accent/20 border-2 border-bg text-accent font-bold text-[10px] grid place-items-center"
              >
                {init}
              </div>
            ))}
          </div>
          <span className="text-sm text-ink-2">
            <strong className="text-ink">12.000+</strong> developer Việt Nam đang học
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
            ))}
            <span className="text-xs text-ink-3 ml-1.5">4.86 / 5</span>
          </div>
        </div>

        <div className="grid grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <h1 className="display text-[46px] leading-[1.1] tracking-tight mb-3">
              Học JavaScript <span className="text-accent">chuyên sâu</span> —<br />
              từ gốc đến production.
            </h1>

            <p className="text-[15px] text-ink-2 max-w-[500px] leading-[1.6] mb-4">
              120h+ nội dung về JS core, async patterns, React internals và Node runtime
              — dạy bởi instructor đang làm việc trong production team thật.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-3 max-w-[480px]">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm khóa học, chủ đề, kỹ năng..."
                  className="input pl-10 w-full h-10"
                />
              </div>
              <Button type="submit">Tìm kiếm</Button>
            </form>

            {/* Popular search terms */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-xs text-ink-3">Phổ biến:</span>
              {POPULAR_TERMS.map((term) => (
                <Link
                  key={term}
                  to={`/courses?q=${encodeURIComponent(term)}`}
                  className="text-xs text-ink-2 hover:text-accent transition-colors underline underline-offset-2 decoration-line"
                >
                  {term}
                </Link>
              ))}
            </div>

            <div className="flex gap-3">
              <Link to="/courses">
                <Button size="lg">Xem tất cả khóa học</Button>
              </Link>
              <Button size="lg" variant="ghost">
                <Play className="w-4 h-4" />
                Xem thử miễn phí
              </Button>
            </div>
          </div>

          {/* Stats 2×2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {STATS.map(({ n, l }) => (
              <div key={l} className="card p-4 flex flex-col gap-1">
                <div className="font-mono font-bold text-[22px] tabular-nums text-ink leading-none">{n}</div>
                <div className="text-[13px] text-ink-2 leading-tight">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Danh mục ──────────────────────────────────────────────────── */}
      <section className="px-16 py-8 border-t border-line">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-[17px]">Khám phá theo chủ đề</h2>
          <Link
            to="/courses"
            className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink transition-colors"
          >
            Tất cả chủ đề <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/courses?category=${c.slug}`}
              className="card p-4 hover:bg-bg-2 hover:border-accent/30 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center font-mono font-bold text-[15px] mb-3 group-hover:bg-accent/20 transition-colors">
                {c.icon}
              </div>
              <div className="font-display font-semibold text-[13px] leading-snug mb-0.5">{c.name}</div>
              <div className="text-[11px] text-ink-3">{c.count} khóa học</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Khóa học (tab filter) ─────────────────────────────────────── */}
      <section className="px-16 py-10 border-t border-line">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="font-display font-bold text-[22px]">Khóa học</h2>
            <div className="flex gap-1 bg-bg-2 rounded-lg p-1">
              {COURSE_TABS.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === i
                      ? 'bg-bg shadow-sm text-ink'
                      : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <Link
            to="/courses"
            className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <CourseSkeleton />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {visibleCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* ── Lộ trình học ──────────────────────────────────────────────── */}
      <section className="px-16 py-10 bg-bg-2 border-t border-b border-line">
        <div className="text-center mb-8">
          <p className="eyebrow mb-2">// Bạn đang ở đâu?</p>
          <h2 className="display text-[28px]">Chọn lộ trình phù hợp</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto">
          {LEARNING_PATHS.map(({ level, tag, title, desc, steps, time, color, border, bg }) => (
            <div key={level} className={`card p-6 border-2 ${border} ${bg} flex flex-col gap-4`}>
              <div>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-widest ${color}`}>
                  {tag}
                </span>
                <h3 className="font-display font-semibold text-[15.5px] mt-2 mb-2">{title}</h3>
                <p className="text-sm text-ink-2 leading-[1.6]">{desc}</p>
              </div>
              <ul className="space-y-2">
                {steps.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-ink-2">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${color}`} />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-3 border-t border-line mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-ink-3">
                  <Clock className="w-3.5 h-3.5" />
                  {time}
                </div>
                <Link
                  to="/courses"
                  className={`flex items-center gap-1 text-xs font-semibold ${color}`}
                >
                  Bắt đầu ngay <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Instructors ───────────────────────────────────────────────── */}
      <section className="px-16 py-10 border-t border-line">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="eyebrow mb-1.5">// Học từ người thực chiến</p>
            <h2 className="font-display font-bold text-[22px]">Instructor của Hoisted</h2>
          </div>
          <Link
            to="/courses"
            className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {INSTRUCTORS.map(({ name, role, courses, students, avatar, bg, fg }) => (
            <div
              key={name}
              className="card p-4 flex flex-col items-center text-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <div
                className={`w-14 h-14 rounded-full ${bg} ${fg} font-bold text-[17px] grid place-items-center`}
              >
                {avatar}
              </div>
              <div>
                <div className="font-display font-semibold text-[13px] leading-snug">{name}</div>
                <div className="text-[11px] text-ink-3 mt-0.5 leading-snug">{role}</div>
              </div>
              <div className="flex gap-3 text-[11px] text-ink-3">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <b className="text-ink">{courses}</b> khóa
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <b className="text-ink">{students}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      {data?.reviews?.length > 0 && (
        <section className="px-16 py-10 border-t border-line bg-bg-2">
          <div className="text-center mb-8">
            <p className="eyebrow mb-2">// Học viên nói gì?</p>
            <h2 className="display text-[28px]">Kết quả thật từ học viên thật</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {data.reviews.map((r) => (
              <div key={r.id} className="card p-6 flex flex-col gap-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-ink-2 leading-[1.75] flex-1">"{r.comment}"</p>
                <div>
                  <div className="text-[11px] text-ink-3 mb-3">
                    Về khóa học:{' '}
                    <span className="text-ink-2 font-medium">{r.course}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt={r.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent/15 text-accent font-bold text-[11px] grid place-items-center flex-shrink-0">
                        {getInitials(r.name)}
                      </div>
                    )}
                    <div>
                      <div className="font-display font-semibold text-[13px]">{r.name}</div>
                      {r.bio && <div className="text-[11px] text-ink-3 line-clamp-1">{r.bio}</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-16 py-12">
        <div
          className="card p-12 text-center relative overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% -10%, rgb(var(--accent) / .10) 0%, transparent 55%), radial-gradient(ellipse at 80% 110%, rgb(99 102 241 / .08) 0%, transparent 55%)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="font-mono text-[120px] font-bold text-ink/[0.025] whitespace-nowrap leading-none">
              {'{ JS }'}
            </span>
          </div>

          <div className="relative">
            <Chip className="mb-4 mx-auto w-fit">
              <Award className="w-3 h-3" />
              Tài liệu miễn phí
            </Chip>
            <h2 className="display text-[36px] mb-3">
              Nhận ngay{' '}
              <span className="text-accent">Event Loop Deep-Dive</span>
            </h2>
            <p className="text-ink-2 max-w-[460px] mx-auto mb-6 leading-[1.65]">
              62 trang PDF chuyên sâu về Event Loop, Microtask Queue và Execution Context
              — miễn phí kèm coupon giảm <strong className="text-ink">30%</strong> cho khóa học đầu tiên.
            </p>
            <div className="flex gap-2.5 justify-center max-w-[400px] mx-auto">
              <input
                className="input flex-1"
                type="email"
                placeholder="your@email.dev"
                autoComplete="email"
              />
              <Button>Nhận miễn phí</Button>
            </div>
            <p className="text-xs text-ink-3 mt-3">Không spam. Hủy đăng ký bất cứ lúc nào.</p>
          </div>
        </div>
      </section>
    </>
  );
}
