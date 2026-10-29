import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Search, Star,
  ChevronRight, Users, BookOpen, Sparkles, Terminal,
  Infinity as InfinityIcon, ShieldCheck, MessageSquareText, Quote,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CourseCard } from '@/components/course-card.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { levelLabel } from '@/lib/format';

function useHomeData() {
  return useQuery({
    queryKey: ['home'],
    queryFn: () => api.get('/api/home').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/api/stats').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

const EMPTY = []; // tham chiếu cố định cho useMemo khi chưa có dữ liệu

/* ── Static content ─────────────────────────────────────────────── */

const POPULAR_TERMS = ['Event loop', 'Closure', 'Promise', 'React', 'TypeScript'];

const COURSE_TABS = ['Phổ biến nhất', 'Mới nhất', 'Miễn phí'];

// Chỉ liệt kê khái niệm / chủ đề có trong danh mục thật
const TECH_TICKER = [
  'Execution context', 'Hoisting', 'Closure', 'Prototype', 'Event loop',
  'Promise', 'async/await', 'React', 'TypeScript', 'Node.js', 'Testing',
];

const BENTO_SMALL = [
  { icon: InfinityIcon, title: 'Truy cập trọn đời', desc: 'Mua một lần, khóa học ở lại trong tài khoản của bạn — không gia hạn, không hết hạn.' },
  { icon: MessageSquareText, title: 'Hỏi đáp trong bài học', desc: 'Đặt câu hỏi ngay dưới bài học; giảng viên và học viên khác cùng trả lời.' },
  { icon: ShieldCheck, title: 'Thanh toán VNPay', desc: 'Thẻ ATM, QR hoặc thẻ quốc tế. Thanh toán xong là khóa học mở ngay.' },
  { icon: Sparkles, title: 'Trợ lý AI chọn khóa', desc: 'Hỏi bằng tiếng Việt về JavaScript hay nên học gì tiếp — trợ lý chỉ gợi ý khóa học có thật trên Hoisted.' },
];

const LEARNING_PATHS = [
  {
    level: 'BEGINNER', tag: 'Mới bắt đầu',
    title: 'Nền tảng JavaScript',
    desc: 'Chưa vững cú pháp và cách JS chạy? Bắt đầu từ biến, hàm, scope rồi mới đến những phần khó.',
    steps: ['Biến, kiểu dữ liệu, hàm', 'Scope & hoisting', 'DOM & sự kiện'],
    color: 'text-success', bar: 'from-success/70 to-success/10',
  },
  {
    level: 'INTERMEDIATE', tag: 'Đã biết cơ bản',
    title: 'Bất đồng bộ & bản chất JS',
    desc: 'Viết được code nhưng chưa giải thích được vì sao nó chạy như vậy — closure, this, Promise, event loop.',
    steps: ['Closure & this', 'Promise & async/await', 'Event loop'],
    color: 'text-accent', bar: 'from-accent/70 to-accent/10',
  },
  {
    level: 'ADVANCED', tag: 'Muốn đi sâu',
    title: 'Engine, framework & runtime',
    desc: 'Đọc code như engine đọc nó, rồi mang hiểu biết đó vào React và Node.',
    steps: ['Prototype chain & class', 'React rendering', 'Node runtime'],
    // Thang độ khó xanh → vàng → đỏ, dùng token sẵn có
    color: 'text-danger', bar: 'from-danger/70 to-danger/10',
  },
];

const FAQS = [
  {
    q: 'Tôi chưa biết gì về lập trình, có học được không?',
    a: 'Được, nhưng hãy bắt đầu với các khóa cấp độ Cơ bản (lọc theo cấp độ ở trang Khóa học). Phần lớn nội dung trên Hoisted dành cho người đã biết code cơ bản và muốn hiểu sâu JavaScript.',
  },
  {
    q: 'Khóa học có thời hạn truy cập không?',
    a: 'Không. Khóa học đã mua ở lại trong mục "Học tập của tôi" và bạn học lúc nào cũng được, không cần gia hạn.',
  },
  {
    q: 'Thanh toán như thế nào?',
    a: 'Qua VNPay: thẻ ATM nội địa, QR hoặc thẻ quốc tế. Thanh toán thành công thì khóa học mở ngay trong mục "Học tập của tôi".',
  },
  {
    q: 'Bài tập code được chấm thế nào?',
    a: 'Bạn viết JavaScript ngay trong trình duyệt. "Chạy thử" kiểm tra với các test công khai; "Nộp bài" chấm thêm các test ẩn. Qua hết test thì bài học được đánh dấu hoàn thành.',
  },
  {
    q: 'Nếu gặp bài khó, tôi hỏi ai?',
    a: 'Mỗi bài học có khu vực thảo luận để hỏi giảng viên và học viên khác. Cần câu trả lời ngay thì hỏi trợ lý AI ở góc màn hình — trợ lý trả lời các câu hỏi về JavaScript và lập trình web.',
  },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCount(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('vi-VN');
}

/* ── Building blocks ────────────────────────────────────────────── */

function SectionHeader({ index, eyebrow, title, desc, action, align = 'left', id }) {
  return (
    <div className={cn('mb-8', align === 'center' ? 'text-center' : 'flex flex-wrap items-end justify-between gap-4')}>
      <div className={align === 'center' ? 'mx-auto max-w-xl' : ''}>
        <p className="eyebrow mb-2 flex items-center gap-2 justify-start">
          <span className={cn('text-accent', align === 'center' && 'mx-auto')}>
            {index} <span className="text-ink-3">/ {eyebrow}</span>
          </span>
        </p>
        <h2 id={id} className="display text-[26px] sm:text-[32px]">{title}</h2>
        {desc && <p className="text-sm text-ink-2 leading-relaxed mt-2 max-w-lg">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* Always-dark editor window — like a real IDE, in both themes */
function CodeWindow() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/40 overflow-hidden font-mono text-[13px] leading-[1.9]">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 h-10 bg-white/[0.04] border-b border-white/10">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" aria-hidden="true" />
        <span className="ml-3 text-[11px] text-slate-400">hoisted.js</span>
      </div>
      {/* Code */}
      <pre className="p-5 text-slate-300 overflow-x-auto" aria-hidden="true">
        <code>
          <span className="text-slate-500">{'// hoisting: dùng trước, khai báo sau'}</span>{'\n'}
          <span className="text-sky-300">console</span>
          <span className="text-slate-400">.</span>
          <span className="text-sky-300">log</span>
          <span className="text-slate-400">(</span>
          <span className="text-sky-300">greet</span>
          <span className="text-slate-400">());</span>
          <span className="text-slate-500">{'  // "Hello, dev!" ✓'}</span>{'\n\n'}
          <span className="text-rose-400">function</span>{' '}
          <span className="text-sky-300">greet</span>
          <span className="text-slate-400">()</span>{' '}
          <span className="text-slate-400">{'{'}</span>{'\n'}
          {'  '}<span className="text-rose-400">return</span>{' '}
          <span className="text-emerald-300">'Hello, dev!'</span>
          <span className="text-slate-400">;</span>{'\n'}
          <span className="text-slate-400">{'}'}</span>{'\n\n'}
          <span className="text-slate-500">{'// hiểu bản chất — không học vẹt'}</span>{'\n'}
          <span className="text-violet-400">const</span>{' '}
          <span className="text-slate-300">you</span>{' '}
          <span className="text-slate-400">=</span>{' '}
          <span className="text-rose-400">await</span>{' '}
          <span className="text-sky-300">hoisted</span>
          <span className="text-slate-400">.</span>
          <span className="text-sky-300">train</span>
          <span className="text-slate-400">(</span>
          <span className="text-emerald-300">'junior'</span>
          <span className="text-slate-400">);</span>{'\n'}
          <span className="text-slate-300">you</span>
          <span className="text-slate-400">.</span>
          <span className="text-sky-300">ship</span>
          <span className="text-slate-400">(</span>
          <span className="text-emerald-300">'production'</span>
          <span className="text-slate-400">);</span>
          <span className="inline-block w-[8px] h-[15px] align-middle ml-0.5 bg-slate-300 animate-caret" />
        </code>
      </pre>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-3 animate-pulse motion-reduce:animate-none">
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

/* ── Page ───────────────────────────────────────────────────────── */

export default function HomePage() {
  const { data, isLoading } = useHomeData();
  const { data: stats } = usePlatformStats();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Không dùng dữ liệu mẫu: API lỗi thì hiện trạng thái rỗng, không hiện khóa học / số liệu giả
  const categories = data?.categories ?? EMPTY;
  const reviewers  = (data?.reviews ?? EMPTY).slice(0, 4);
  const allCourses = data?.featured ?? EMPTY;
  const newestCourses = data?.newest ?? [...allCourses].sort((a, b) => b.id - a.id).slice(0, 4);

  const visibleCourses = (() => {
    if (activeTab === 2) return allCourses.filter((c) => Number(c.price) === 0);
    if (activeTab === 1) return newestCourses;
    return allCourses.slice(0, 8);
  })();

  // Real instructors aggregated from the featured-courses payload
  const instructors = useMemo(() => {
    const map = new Map();
    for (const c of allCourses) {
      if (!c.instructor) continue;
      const cur = map.get(c.instructor) ?? { name: c.instructor, courses: 0, students: 0 };
      cur.courses += 1;
      cur.students += Number(c.students) || 0;
      map.set(c.instructor, cur);
    }
    return [...map.values()].sort((a, b) => b.students - a.students).slice(0, 6);
  }, [allCourses]);

  // totalUsers đếm mọi tài khoản → không gọi là "đang học", không thêm "+"
  const heroStats = [
    { n: stats ? formatCount(stats.totalUsers) : '—', l: 'Tài khoản đã đăng ký' },
    // Điểm TB chỉ có nghĩa khi có lượt đánh giá thật — ghi kèm số lượt để 5/5 từ 2 người không bị đọc thành "xuất sắc"
    {
      n: stats?.totalReviews ? `${stats.avgRating}/5` : '—',
      l: stats?.totalReviews ? `Điểm đánh giá từ ${formatCount(stats.totalReviews)} lượt` : 'Chưa có đánh giá',
    },
    { n: stats ? formatCount(stats.totalPublishedCourses) : '—', l: 'Khóa học đã xuất bản' },
    { n: stats ? formatCount(stats.freeCourses) : '—', l: 'Khóa học miễn phí' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/courses?q=${encodeURIComponent(q)}`);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Hoisted',
        url: origin,
        description: 'Nền tảng học JavaScript, React và Node.js chuyên sâu bằng tiếng Việt.',
      },
      {
        '@type': 'WebSite',
        name: 'Hoisted — Học JS từ gốc',
        url: origin,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/courses?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Khóa học nổi bật',
        itemListElement: allCourses.slice(0, 8).map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.title,
          url: `${origin}/courses/${c.slug ?? c.id}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }), [origin, allCourses]);

  return (
    <>
      <Seo
        title="Hoisted — Học JavaScript chuyên sâu từ gốc đến production"
        description="Học JavaScript từ bản chất bằng tiếng Việt: execution context, closure, event loop, async. Video bài giảng, bài tập code chấm tự động ngay trên trình duyệt và trợ lý AI gợi ý khóa học."
        jsonLd={jsonLd}
      />

      {/* ════ HERO ═══════════════════════════════════════════════ */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden">
        {/* Layered backdrop: grid + glows */}
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 45% at 18% 0%, rgb(var(--accent) / .14) 0%, transparent 60%), radial-gradient(ellipse 45% 40% at 85% 90%, rgb(99 102 241 / .12) 0%, transparent 60%)',
          }}
        />

        <div className="relative px-5 sm:px-8 lg:px-16 pt-14 lg:pt-20 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
            {/* Copy */}
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 h-7 pl-1.5 pr-3 rounded-full border border-accent/25 bg-accent/10 mb-6">
                  <span className="chip !h-5 !px-2 !text-[10px]">
                    <Terminal className="w-3 h-3" aria-hidden="true" /> Bài tập
                  </span>
                  <span className="text-xs text-ink-2 font-medium">Viết code, chấm bằng test ngay trên trình duyệt</span>
                </div>
              </Reveal>

              <Reveal delay={60}>
                <h1 id="hero-heading" className="display text-[38px] sm:text-[48px] lg:text-[56px] leading-[1.06] mb-5">
                  Code như người
                  <br />
                  <span className="text-accent">
                    hiểu bản chất.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={120}>
                <p className="text-[15.5px] text-ink-2 max-w-[480px] leading-[1.7] mb-7">
                  Execution context, closure, event loop, async — xem bài giảng, rồi
                  <strong className="text-ink"> tự viết code và được chấm bằng test</strong>{' '}
                  ngay trên trình duyệt. Bí chỗ nào thì hỏi trợ lý AI.
                </p>
              </Reveal>

              <Reveal delay={180}>
                <form onSubmit={handleSearch} role="search" className="mb-4 max-w-[500px]">
                  <div className="relative flex items-center rounded-2xl border border-line bg-bg-1/80 backdrop-blur p-1.5 shadow-lg shadow-black/5 focus-within:border-accent/50 transition-colors">
                    <Search className="ml-3 w-4 h-4 text-ink-3 pointer-events-none flex-shrink-0" aria-hidden="true" />
                    <label htmlFor="home-search" className="sr-only">Tìm khóa học</label>
                    <input
                      id="home-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Bạn muốn học gì hôm nay?"
                      className="flex-1 h-10 bg-transparent border-0 outline-none px-3 text-sm font-medium text-ink placeholder:text-ink-3 min-w-0"
                    />
                    <Button type="submit" className="rounded-xl">
                      Tìm kiếm
                    </Button>
                  </div>
                </form>
              </Reveal>

              <Reveal delay={220}>
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <span className="text-xs text-ink-3">Phổ biến:</span>
                  {POPULAR_TERMS.map((term) => (
                    <Link
                      key={term}
                      to={`/courses?q=${encodeURIComponent(term)}`}
                      className="chip-line hover:border-accent/40 hover:text-accent transition-colors"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={260}>
                <div className="flex flex-wrap items-center gap-5">
                  <Link to="/courses">
                    <Button size="lg" className="shadow-[0_8px_30px_rgb(var(--accent)/0.35)]">
                      Khám phá khóa học <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                  {/* Avatar = người đánh giá thật (từ /api/home); số sao theo điểm thật; chưa có số liệu thì ẩn */}
                  {stats && (
                    <div className="flex items-center gap-3">
                      {reviewers.length > 0 && (
                        <div className="flex -space-x-2" aria-hidden="true">
                          {reviewers.map((r) => (
                            r.avatar_url ? (
                              <img key={r.id} src={r.avatar_url} alt="" width="32" height="32" loading="lazy"
                                className="w-8 h-8 rounded-full object-cover border-2 border-bg" />
                            ) : (
                              <div key={r.id}
                                className="w-8 h-8 rounded-full bg-accent/20 border-2 border-bg text-accent font-bold text-[10px] grid place-items-center">
                                {getInitials(r.name)}
                              </div>
                            )
                          ))}
                        </div>
                      )}
                      <div className="text-xs leading-tight">
                        {stats.totalReviews > 0 && (
                          <div className="flex items-center gap-0.5"
                            aria-label={`${stats.avgRating} trên 5 sao từ ${formatCount(stats.totalReviews)} lượt đánh giá`}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} aria-hidden="true"
                                className={cn('w-3 h-3', i <= Math.round(stats.avgRating) ? 'fill-accent text-accent' : 'text-line')} />
                            ))}
                            <b className="ml-1 text-ink">{stats.avgRating}/5</b>
                            <span className="ml-1 text-ink-3">· {formatCount(stats.totalReviews)} lượt</span>
                          </div>
                        )}
                        <span className="text-ink-3">{heroStats[0].n} tài khoản đã đăng ký</span>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>

            {/* IDE window + floating badges */}
            <Reveal delay={200} className="hidden lg:block">
              <div className="relative">
                <div
                  className="absolute -inset-8 rounded-[32px] pointer-events-none"
                  aria-hidden="true"
                  style={{ background: 'radial-gradient(ellipse at 50% 40%, rgb(var(--accent) / .12) 0%, transparent 70%)' }}
                />
                <CodeWindow />

                <div className="absolute -left-8 -bottom-7 animate-float">
                  <div className="card px-4 py-3 flex items-center gap-3 shadow-xl backdrop-blur bg-bg-1/90">
                    <div className="w-9 h-9 rounded-xl bg-success/15 text-success grid place-items-center">
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-[13px] leading-tight">Truy cập trọn đời</div>
                      <div className="text-[11px] text-ink-3">Mua 1 lần · học mãi mãi</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-5 -top-6 animate-float" style={{ animationDelay: '-3.5s' }}>
                  <div className="card px-4 py-3 flex items-center gap-3 shadow-xl backdrop-blur bg-bg-1/90">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent grid place-items-center">
                      <Terminal className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-display font-bold text-[13px] leading-tight">Chấm code tự động</div>
                      <div className="text-[11px] text-ink-3">Test công khai · test ẩn</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Tech marquee */}
        <div className="relative border-t border-line py-4 overflow-hidden mask-fade-x" aria-hidden="true">
          <div className="flex w-max animate-marquee gap-0">
            {[...TECH_TICKER, ...TECH_TICKER].map((t, i) => (
              <span key={i} className="flex items-center font-mono text-xs text-ink-3 uppercase tracking-[0.12em]">
                <span className="px-6">{t}</span>
                <span className="w-1 h-1 rounded-full bg-accent/60" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════ STATS ══════════════════════════════════════════════ */}
      <section aria-label="Số liệu nền tảng" className="px-5 sm:px-8 lg:px-16 py-10 border-t border-line bg-bg-2">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          {heroStats.map(({ n, l }, i) => (
            <Reveal key={l} delay={i * 60} className={cn('lg:px-8', i > 0 && 'lg:border-l lg:border-line')}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display font-bold text-[30px] sm:text-[36px] tabular-nums tracking-tight leading-none">
                {n}
              </dd>
              <dd className="text-[13px] text-ink-3 mt-2">{l}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ════ BENTO — vì sao Hoisted ═════════════════════════════ */}
      <section aria-labelledby="why-heading" className="px-5 sm:px-8 lg:px-16 py-14 border-t border-line">
        <SectionHeader
          index="01"
          eyebrow="Triết lý đào tạo"
          title="Học sâu. Không học vẹt."
          desc="Mọi bài học đều đi từ cách JavaScript thật sự hoạt động bên dưới — không phải chỉ cú pháp bề mặt."
          id="why-heading"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Large feature card */}
          <Reveal className="md:col-span-2 xl:row-span-2">
            <div className="card p-7 h-full flex flex-col relative overflow-hidden group hover:border-accent/30 transition-colors">
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                aria-hidden="true"
                style={{ background: 'radial-gradient(ellipse at 30% 0%, rgb(var(--accent) / .07) 0%, transparent 60%)' }}
              />
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent grid place-items-center mb-5">
                  <Terminal className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-[19px] mb-2">Hiểu engine, không đoán mò</h3>
                <p className="text-sm text-ink-2 leading-[1.7] mb-6 max-w-md">
                  Execution context, hoisting, event loop, closure — bạn sẽ đọc được code
                  như cách V8 đọc nó. Phỏng vấn hay debug production đều không còn là may rủi.
                </p>
                <div className="soft p-4 font-mono text-[12px] leading-[1.9] text-ink-2 overflow-x-auto">
                  <div><span className="text-ink-3">{'// bạn sau khóa học:'}</span></div>
                  <div>Promise.resolve().then(A); setTimeout(B);</div>
                  <div>
                    <span className="text-ink-3">{'// → biết chắc A chạy trước B, và giải thích được vì sao ✓'}</span>
                  </div>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {['Video, tài liệu PDF và quiz trong cùng một bài học', 'Bài tập code chấm bằng test ẩn', 'Thảo luận với giảng viên ngay dưới bài học'].map((s) => (
                    <li key={s} className="flex items-center gap-2.5 text-sm text-ink-2">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          {BENTO_SMALL.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={80 + i * 60}>
              <div className="card p-6 h-full group hover:border-accent/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-semibold text-[15px] mb-1.5">{title}</h3>
                <p className="text-[13px] text-ink-3 leading-[1.65]">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════ CATEGORIES ═════════════════════════════════════════ */}
      {/* API lỗi / chưa có danh mục → ẩn cả mục, không để lại tiêu đề trên lưới rỗng */}
      {categories.length > 0 && (
      <section aria-labelledby="categories-heading" className="px-5 sm:px-8 lg:px-16 py-14 border-t border-line bg-bg-2">
        <SectionHeader
          index="02"
          eyebrow="Chủ đề"
          title="Khám phá theo chủ đề"
          id="categories-heading"
          action={
            <Link to="/courses" className="flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">
              Tất cả chủ đề <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 40}>
              <Link
                to={`/courses?category=${c.slug}`}
                className="card p-5 flex flex-col h-full group relative overflow-hidden hover:border-accent/40 hover:-translate-y-1 motion-reduce:hover:translate-y-0 transition-all duration-200"
              >
                <div
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent to-indigo opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center font-mono font-bold text-[16px] mb-4 group-hover:scale-110 motion-reduce:group-hover:scale-100 group-hover:bg-accent/20 transition-all duration-200">
                  {c.icon}
                </div>
                <h3 className="font-display font-semibold text-[13.5px] leading-snug mb-1">{c.name}</h3>
                <p className="text-[11px] text-ink-3 mt-auto">{c.count} khóa học</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* ════ COURSES ════════════════════════════════════════════ */}
      <section aria-labelledby="courses-heading" className="px-5 sm:px-8 lg:px-16 py-14 border-t border-line">
        <SectionHeader
          index="03"
          eyebrow="Khóa học"
          title="Bắt đầu từ một khóa học"
          id="courses-heading"
          action={
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-1 bg-bg-2 rounded-xl p-1" role="tablist" aria-label="Bộ lọc khóa học">
                {COURSE_TABS.map((tab, i) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === i}
                    onClick={() => setActiveTab(i)}
                    className={cn(
                      'px-3 sm:px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer',
                      activeTab === i ? 'bg-bg-1 shadow-sm text-ink' : 'text-ink-3 hover:text-ink-2',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <Link to="/courses" className="flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">
                Xem tất cả <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          }
        />

        {isLoading ? (
          <CourseSkeleton />
        ) : visibleCourses.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-ink-2 mb-3">Chưa có khóa học nào trong mục này.</p>
            <Link to="/courses" className="text-sm text-accent font-semibold hover:underline">
              Xem tất cả khóa học →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {visibleCourses.map((c, i) => (
              <Reveal key={c.id} delay={(i % 4) * 60}>
                <CourseCard course={c} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ════ LEARNING PATHS ═════════════════════════════════════ */}
      <section aria-labelledby="paths-heading" className="relative px-5 sm:px-8 lg:px-16 py-16 border-t border-line bg-bg-2 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgb(var(--accent) / .06) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <SectionHeader
            index="04"
            eyebrow="Lộ trình"
            title="Bạn đang ở đâu trên con đường?"
            desc="Mỗi khóa học ghi rõ cấp độ. Chọn đúng điểm bắt đầu để không học lại thứ đã biết."
            align="center"
            id="paths-heading"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {LEARNING_PATHS.map(({ level, tag, title, desc, steps, color, bar }, i) => (
              <Reveal key={level} delay={i * 90}>
                <div className="card h-full flex flex-col overflow-hidden hover:-translate-y-1 motion-reduce:hover:translate-y-0 hover:shadow-xl transition-all duration-200">
                  <div className={cn('h-1 bg-gradient-to-r', bar)} aria-hidden="true" />
                  <div className="p-6 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between">
                      <span className={cn('text-[11px] font-mono font-bold uppercase tracking-widest', color)}>
                        {tag}
                      </span>
                      <span className="font-mono text-[28px] font-bold text-ink/10 leading-none select-none" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-[16.5px] mb-2">{title}</h3>
                      <p className="text-sm text-ink-2 leading-[1.65]">{desc}</p>
                    </div>
                    <ol className="space-y-0">
                      {steps.map((s, si) => (
                        <li key={s} className="relative flex items-center gap-3 text-sm text-ink-2 py-1.5">
                          <span className="relative flex flex-col items-center self-stretch justify-center">
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', color.replace('text-', 'bg-'))} aria-hidden="true" />
                            {si < steps.length - 1 && (
                              <span className="absolute top-[60%] w-px h-[calc(100%)] bg-line" aria-hidden="true" />
                            )}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    <div className="flex items-center justify-between pt-4 border-t border-line mt-auto">
                      <div className="flex items-center gap-1.5 text-xs text-ink-3">
                        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                        Cấp độ {levelLabel(level)}
                      </div>
                      <Link to={`/courses?level=${level}`} className={cn('flex items-center gap-1 text-xs font-semibold hover:gap-2 transition-all', color)}>
                        Xem khóa {levelLabel(level).toLowerCase()} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════ INSTRUCTORS ════════════════════════════════════════ */}
      {instructors.length > 0 && (
        <section aria-labelledby="instructors-heading" className="px-5 sm:px-8 lg:px-16 py-14 border-t border-line">
          <SectionHeader
            index="05"
            eyebrow="Instructor"
            title="Giảng viên các khóa nổi bật"
            id="instructors-heading"
            action={
              <Link to="/courses" className="flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors">
                Xem tất cả <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {instructors.map(({ name, courses, students }, i) => (
              <Reveal key={name} delay={i * 50}>
                <div className="card p-5 h-full flex flex-col items-center text-center gap-3.5 hover:-translate-y-1 motion-reduce:hover:translate-y-0 hover:shadow-lg hover:border-accent/30 transition-all duration-200">
                  <div className="p-[2.5px] rounded-full bg-gradient-to-br from-accent to-indigo">
                    <div className="w-14 h-14 rounded-full bg-bg-1 text-ink font-bold text-[16px] grid place-items-center" aria-hidden="true">
                      {getInitials(name)}
                    </div>
                  </div>
                  <h3 className="font-display font-semibold text-[13px] leading-snug">{name}</h3>
                  <div className="flex gap-3 text-[11px] text-ink-3 mt-auto">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" aria-hidden="true" />
                      <b className="text-ink">{courses}</b> khóa
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" aria-hidden="true" />
                      <b className="text-ink">{formatCount(students)}</b> học viên
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ════ TESTIMONIALS ═══════════════════════════════════════ */}
      {data?.reviews?.length > 0 && (
        <section aria-labelledby="reviews-heading" className="px-5 sm:px-8 lg:px-16 py-16 border-t border-line bg-bg-2">
          <SectionHeader
            index="06"
            eyebrow="Học viên"
            title="Học viên nói gì"
            align="center"
            id="reviews-heading"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.reviews.map((r, i) => (
              <Reveal key={r.id} delay={i * 90}>
                <figure className="card p-7 h-full flex flex-col gap-4 relative hover:border-accent/25 transition-colors">
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-accent/15" aria-hidden="true" />
                  <div className="flex items-center gap-0.5" aria-label={`${r.rating} trên 5 sao`}>
                    {Array.from({ length: r.rating }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-accent text-accent" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="text-[14.5px] text-ink-2 leading-[1.8] flex-1">
                    "{r.comment}"
                  </blockquote>
                  <figcaption className="pt-4 border-t border-line">
                    <div className="flex items-center gap-3">
                      {r.avatar_url ? (
                        <img
                          src={r.avatar_url}
                          alt={`Ảnh đại diện của ${r.name}`}
                          width="40"
                          height="40"
                          loading="lazy"
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-bold text-[12px] grid place-items-center flex-shrink-0" aria-hidden="true">
                          {getInitials(r.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-[13.5px]">{r.name}</div>
                        <div className="text-[11px] text-ink-3 truncate">
                          {r.bio || <>Học viên · {r.course}</>}
                        </div>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ════ FAQ ════════════════════════════════════════════════ */}
      <section aria-labelledby="faq-heading" className="px-5 sm:px-8 lg:px-16 py-16 border-t border-line">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            index="07"
            eyebrow="FAQ"
            title="Bạn còn băn khoăn?"
            align="center"
            id="faq-heading"
          />
          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 50}>
                <details className="card group open:border-accent/30 transition-colors">
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none font-display font-semibold text-[14.5px] [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="w-7 h-7 rounded-lg bg-bg-2 grid place-items-center flex-shrink-0 group-open:bg-accent/15 transition-colors" aria-hidden="true">
                      <ChevronRight className="w-4 h-4 text-ink-3 group-open:text-accent transition-transform duration-200 group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-ink-2 leading-[1.75]">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA — terminal ═══════════════════════════════ */}
      <section aria-labelledby="cta-heading" className="px-5 sm:px-8 lg:px-16 pb-16 pt-2">
        <Reveal>
          <div className="relative rounded-3xl border border-line overflow-hidden bg-bg-1">
            <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse 50% 60% at 25% 0%, rgb(var(--accent) / .14) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 85% 100%, rgb(99 102 241 / .12) 0%, transparent 60%)',
              }}
            />
            <div className="relative px-6 sm:px-14 py-14 sm:py-16 text-center">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-bg-2/80 backdrop-blur px-4 h-9 font-mono text-[12.5px] text-ink-2 mb-7">
                <span className="text-accent">$</span>
                <span>npx hoisted@latest bắt-đầu</span>
                <span className="inline-block w-[7px] h-[14px] bg-ink-2 animate-caret" aria-hidden="true" />
              </div>
              <h2 id="cta-heading" className="display text-[30px] sm:text-[42px] mb-4 max-w-2xl mx-auto">
                Sẵn sàng trở thành developer{' '}
                <span className="text-accent">hiểu bản chất</span>?
              </h2>
              <p className="text-ink-2 max-w-[480px] mx-auto mb-8 leading-[1.7] text-[15px]">
                Tạo tài khoản miễn phí, xem thử các bài học mở sẵn và hỏi trợ lý AI
                nên bắt đầu từ khóa nào.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/register">
                  <Button size="lg" className="shadow-[0_8px_30px_rgb(var(--accent)/0.35)]">
                    Tạo tài khoản miễn phí
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button size="lg" variant="ghost">
                    Xem khóa học <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-ink-3 mt-4">Đăng ký không cần thẻ thanh toán · Chỉ trả tiền cho khóa bạn mua</p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
