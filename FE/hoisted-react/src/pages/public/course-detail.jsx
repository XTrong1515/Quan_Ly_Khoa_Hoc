import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, Clock, BookOpen, Users, ChevronDown, ChevronRight, Play,
  ShoppingCart, Zap, Check, X, Lock, Trash2, Gift, Heart, Award, MonitorPlay,
} from 'lucide-react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { Seo } from '@/components/seo.jsx';
import { api, apiMessage } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { formatVND, formatHours } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWishlistIds, useWishlistToggle } from '@/hooks/useWishlist';

function useCourseDetail(slug) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/api/courses/${slug}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export default function CourseDetailPage() {
  const { slug }       = useParams();
  const { role }       = useAuth();
  const { add, items } = useCart();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const { data: wishlistIds = [] } = useWishlistIds();
  const wishlistToggle = useWishlistToggle();
  const [tab, setTab]  = useState('overview');
  const [previewLesson, setPreviewLesson] = useState(null);

  const { data, isLoading, isError } = useCourseDetail(slug);

  const enrollFreeMutation = useMutation({
    mutationFn: (courseId) => api.post('/api/enrollments', { courseId }),
    onSuccess: () => {
      toast.success('Đăng ký thành công! Bắt đầu học ngay.');
      queryClient.invalidateQueries({ queryKey: ['course', slug] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-course-ids'] });
    },
    onError: (err) => toast.error(apiMessage(err, 'Đăng ký thất bại')),
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = useMemo(() => {
    const course = data?.course;
    if (!course) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.short_description || course.title,
      url: `${origin}/courses/${course.slug ?? course.id}`,
      provider: { '@type': 'Organization', name: 'Hoisted', url: origin },
      ...(course.rating > 0 && course.review_count > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: course.rating,
          reviewCount: course.review_count,
        },
      }),
      offers: {
        '@type': 'Offer',
        price: Number(course.price) || 0,
        priceCurrency: 'VND',
        availability: 'https://schema.org/InStock',
      },
    };
  }, [data?.course, origin]);

  if (isLoading) return <CourseDetailSkeleton />;
  if (isError || !data?.course) {
    return (
      <div className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
        <div className="relative">
          <p className="font-mono text-[42px] font-bold text-ink/15 mb-2">404</p>
          <p className="text-ink-2 mb-5">Không tìm thấy khóa học.</p>
          <Link to="/courses"><Button variant="ghost">← Quay lại danh sách</Button></Link>
        </div>
      </div>
    );
  }

  const { course, lessons = [], reviews = [], isEnrolled = false } = data;
  const isFree       = parseFloat(course.price) === 0;
  const inCart       = items.some((i) => i.courseId === course.id);
  const isWishlisted = wishlistIds.includes(course.id);
  const previewCount = lessons.filter((l) => l.is_preview).length;
  const discount     = course.originalPrice > course.price
    ? Math.round((1 - course.price / course.originalPrice) * 100)
    : 0;

  const handleWishlist = () => {
    if (role === 'guest') { toast.error('Vui lòng đăng nhập để lưu yêu thích'); navigate('/login'); return; }
    wishlistToggle.mutate({ courseId: course.id, isWishlisted });
  };

  const handleAddCart = () => {
    add(course.id);
    toast.success(`Đã thêm "${course.title}" vào giỏ`);
  };
  const handleBuyNow = () => {
    add(course.id);
    navigate('/cart');
  };
  const handleEnrollFree = () => {
    if (role === 'guest') {
      toast.error('Vui lòng đăng nhập để đăng ký');
      navigate('/login');
      return;
    }
    enrollFreeMutation.mutate(course.id);
  };
  const handleGoLearn = () => navigate(`/learn/${course.id}/${lessons[0]?.id}`);

  // Group lessons by section
  const sections = lessons.reduce((acc, l) => {
    const key = l.section_title ?? 'Phần 1';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const TABS = [
    { id: 'overview',   label: 'Mô tả' },
    { id: 'curriculum', label: `Nội dung (${lessons.length})` },
    { id: 'reviews',    label: `Đánh giá (${reviews.length})` },
    { id: 'instructor', label: 'Giảng viên' },
  ];

  return (
    <>
      <Seo
        title={`${course.title} — Hoisted`}
        description={(course.short_description || course.title).slice(0, 158)}
        jsonLd={jsonLd}
      />

      {/* Preview modal (UC04) */}
      {previewLesson && (
        <PreviewModal lesson={previewLesson} onClose={() => setPreviewLesson(null)} />
      )}

      <div className="relative">
        {/* Cinematic hero band — content flows over its faded edge */}
        <div className="absolute inset-x-0 top-0 h-[460px] overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-bg-2" />
          <div className="absolute inset-0 bg-grid mask-fade-y" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 55% 65% at 20% 0%, rgb(var(--accent) / .13) 0%, transparent 60%), radial-gradient(ellipse 45% 55% at 95% 30%, rgb(99 102 241 / .10) 0%, transparent 60%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-10 pb-16 lg:grid lg:grid-cols-[1fr_330px] lg:gap-12 lg:items-start">
          {/* ── Left: content ─────────────────────────────────────── */}
          <div className="min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 font-mono text-[12px] text-ink-3 mb-5" aria-label="Breadcrumb">
              <Link to="/courses" className="hover:text-accent transition-colors">Khóa học</Link>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <span className="text-ink-2">{course.category}</span>
            </nav>

            <div className="flex flex-wrap gap-2 mb-4">
              <Chip variant="line">{course.category}</Chip>
              <Chip variant="line">{course.level}</Chip>
              {course.tag && <Chip>{course.tag}</Chip>}
            </div>

            <h1 className="display text-[30px] sm:text-[38px] leading-[1.12] mb-4">{course.title}</h1>
            <p className="text-ink-2 text-[15px] leading-[1.7] max-w-[620px] mb-6">{course.short_description}</p>

            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
              <span className="flex items-center gap-1.5 text-[13.5px]">
                <Star className="w-4 h-4 fill-accent text-accent" aria-hidden="true" />
                <b className="text-ink font-mono">{course.rating}</b>
                <span className="text-ink-3">({course.review_count?.toLocaleString('vi-VN')} đánh giá)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[13.5px] text-ink-2">
                <Users className="w-4 h-4 text-ink-3" aria-hidden="true" />
                {course.students?.toLocaleString('vi-VN')} học viên
              </span>
              <span className="flex items-center gap-1.5 text-[13.5px] text-ink-2">
                <Clock className="w-4 h-4 text-ink-3" aria-hidden="true" />
                {formatHours(course.hours ?? 0)}
              </span>
              <span className="flex items-center gap-1.5 text-[13.5px] text-ink-2">
                <BookOpen className="w-4 h-4 text-ink-3" aria-hidden="true" />
                {course.lessons} bài học
              </span>
            </div>

            {/* Instructor line */}
            <div className="flex items-center gap-3 mb-10">
              <div className="p-[2px] rounded-full bg-gradient-to-br from-accent to-indigo">
                <div className="w-9 h-9 rounded-full bg-bg-1 grid place-items-center font-bold text-[13px] text-ink">
                  {course.instructor?.[0]?.toUpperCase()}
                </div>
              </div>
              <div className="text-[13px] leading-tight">
                <span className="text-ink-3">Giảng viên</span>
                <p className="text-ink font-semibold">{course.instructor}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-line mb-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Nội dung khóa học">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'px-4 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer',
                    tab === t.id
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {tab === 'overview' && (
              <div
                className="prose prose-sm max-w-none text-ink-2 leading-[1.75] [&_h3]:text-ink [&_h3]:font-display [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: course.description || course.short_description }}
              />
            )}

            {tab === 'curriculum' && (
              <div className="space-y-3">
                {previewCount > 0 && (
                  <p className="flex items-center gap-2 text-[12.5px] text-ink-3 font-mono mb-4">
                    <MonitorPlay className="w-4 h-4 text-accent" aria-hidden="true" />
                    {previewCount} bài học xem thử miễn phí — bấm "Preview" để xem ngay
                  </p>
                )}
                {Object.entries(sections).length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-sm text-ink-2">Nội dung khóa học đang được cập nhật.</p>
                  </div>
                ) : (
                  Object.entries(sections).map(([sectionTitle, sectionLessons], si) => (
                    <SectionAccordion
                      key={sectionTitle}
                      index={si + 1}
                      title={sectionTitle}
                      lessons={sectionLessons}
                      isEnrolled={isEnrolled}
                      onPreview={setPreviewLesson}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <>
                {isEnrolled && <WriteReviewSection courseId={course.id} />}
                <ReviewsList reviews={reviews} course={course} />
              </>
            )}

            {tab === 'instructor' && (
              <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start">
                <div className="p-[3px] rounded-2xl bg-gradient-to-br from-accent to-indigo flex-shrink-0">
                  <div className="w-16 h-16 rounded-[13px] bg-bg-1 grid place-items-center font-display font-bold text-[22px] text-ink">
                    {course.instructor?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="font-display font-bold text-[18px] mb-1">{course.instructor}</p>
                  <p className="text-ink-3 text-[13px] mb-3">Senior JavaScript Engineer</p>
                  <div className="flex flex-wrap gap-4 text-[12.5px] text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" aria-hidden="true" />
                      {course.rating} điểm đánh giá
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                      {course.students?.toLocaleString('vi-VN')} học viên
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: floating purchase card ─────────────────────── */}
          <aside className="mt-10 lg:mt-0 lg:sticky lg:top-20">
            <div className="card overflow-hidden shadow-2xl shadow-black/20 lg:rounded-2xl">
              <div className="relative">
                <CourseThumb course={course} className="rounded-none" />
                {discount > 0 && (
                  <span className="absolute top-3 right-3 h-6 px-2.5 rounded-full bg-danger text-white font-mono text-[11.5px] font-bold grid place-items-center shadow-lg">
                    -{discount}%
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-end gap-2.5 mb-5">
                  <span className={cn('font-mono font-bold text-[28px] leading-none', isFree ? 'text-accent' : 'text-ink')}>
                    {formatVND(course.price)}
                  </span>
                  {discount > 0 && (
                    <span className="font-mono text-[14px] text-ink-3 line-through">
                      {formatVND(course.originalPrice)}
                    </span>
                  )}
                </div>

                {isEnrolled ? (
                  <Button size="lg" className="w-full justify-center mb-2" onClick={handleGoLearn}>
                    <Play className="w-4 h-4" aria-hidden="true" /> Tiếp tục học
                  </Button>
                ) : isFree ? (
                  <Button
                    size="lg"
                    className="w-full justify-center mb-2 shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
                    disabled={enrollFreeMutation.isPending}
                    onClick={handleEnrollFree}
                  >
                    <Gift className="w-4 h-4" aria-hidden="true" />
                    {enrollFreeMutation.isPending ? 'Đang đăng ký…' : 'Đăng ký miễn phí'}
                  </Button>
                ) : (
                  <>
                    {inCart ? (
                      <Link to="/cart" className="block mb-2">
                        <Button size="lg" className="w-full justify-center">
                          <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Xem giỏ hàng →
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full justify-center mb-2 shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
                        onClick={handleAddCart}
                      >
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Thêm vào giỏ
                      </Button>
                    )}
                    {!inCart && (
                      <Button size="lg" variant="ghost" className="w-full justify-center" onClick={handleBuyNow}>
                        <Zap className="w-4 h-4" aria-hidden="true" /> Mua ngay
                      </Button>
                    )}
                  </>
                )}

                {role !== 'guest' && !isEnrolled && (
                  <button
                    onClick={handleWishlist}
                    disabled={wishlistToggle.isPending}
                    className={cn(
                      'w-full mt-2 flex items-center justify-center gap-2 h-10 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer',
                      isWishlisted
                        ? 'border-danger/40 text-danger bg-danger/5 hover:bg-danger/10'
                        : 'border-line text-ink-2 hover:bg-bg-2',
                    )}
                  >
                    <Heart className={cn('w-3.5 h-3.5', isWishlisted && 'fill-danger')} aria-hidden="true" />
                    {isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                  </button>
                )}

                <ul className="mt-5 pt-5 border-t border-line space-y-2.5 text-[12.5px] text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                    {course.lessons} bài học video
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                    {formatHours(course.hours ?? 0)} tổng thời lượng
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                    Truy cập trọn đời
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                    Certificate khi hoàn thành
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ── Section Accordion (curriculum tab) ────────────────────────── */
function SectionAccordion({ index, title, lessons, isEnrolled, onPreview }) {
  const [open, setOpen] = useState(index === 1);
  const totalMin = lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  return (
    <div className={cn('card overflow-hidden transition-colors', open && 'border-accent/25')}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-2 transition-colors text-left cursor-pointer"
      >
        <span className="font-mono text-[12px] font-bold text-accent w-6 flex-shrink-0" aria-hidden="true">
          {String(index).padStart(2, '0')}
        </span>
        <span className="flex-1 font-display font-semibold text-[14px] text-ink">{title}</span>
        <span className="flex items-center gap-3 text-ink-3 font-mono text-[11.5px] flex-shrink-0">
          <span className="hidden sm:inline">{lessons.length} bài · {Math.round(totalMin / 60 * 10) / 10}h</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="border-t border-line divide-y divide-line">
          {lessons.map((l, li) => (
            <div key={l.id} className="flex items-center gap-3 pl-5 pr-4 py-3 hover:bg-bg-2 transition-colors group">
              <span className="font-mono text-[11px] text-ink-3 w-6 flex-shrink-0" aria-hidden="true">
                {String(li + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-[13px] text-ink-2 group-hover:text-ink transition-colors min-w-0 truncate">
                {l.title}
              </span>
              {l.duration_minutes > 0 && (
                <span className="font-mono text-[11.5px] text-ink-3 flex-shrink-0">{l.duration_minutes}m</span>
              )}
              {l.is_preview ? (
                <button
                  onClick={() => onPreview(l)}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-mono text-[11px] font-semibold hover:bg-accent/20 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3" aria-hidden="true" /> Preview
                </button>
              ) : isEnrolled ? (
                <Play className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" aria-label="Đã mở khóa" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" aria-label="Cần mua khóa học" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reviews list + rating distribution ─────────────────────────── */
function ReviewsList({ reviews, course }) {
  if (!reviews.length) {
    return (
      <div className="card p-10 text-center">
        <Star className="w-8 h-8 text-ink-3/40 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-ink-2">Chưa có đánh giá nào — hãy là người đầu tiên.</p>
      </div>
    );
  }

  const dist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    n: reviews.filter((r) => Math.round(r.rating) === s).length,
  }));

  return (
    <div>
      {/* Summary panel */}
      <div className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-7 items-center">
        <div className="text-center sm:pr-7 sm:border-r sm:border-line">
          <div className="font-mono font-bold text-[48px] text-ink leading-none tabular-nums">{course.rating}</div>
          <div className="flex gap-0.5 mt-2 justify-center" aria-label={`${course.rating} trên 5 sao`}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={cn('w-4 h-4', s <= Math.round(course.rating) ? 'fill-accent text-accent' : 'text-line')} aria-hidden="true" />
            ))}
          </div>
          <div className="font-mono text-[11px] text-ink-3 mt-2">{reviews.length} đánh giá hiển thị</div>
        </div>
        <div className="space-y-1.5" aria-hidden="true">
          {dist.map(({ star, n }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="font-mono text-[11.5px] text-ink-3 w-6 text-right">{star}★</span>
              <div className="flex-1 h-2 rounded-full bg-bg-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
                  style={{ width: `${(n / reviews.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11.5px] text-ink-3 w-6">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="card p-5 flex gap-4">
            <div
              className="w-10 h-10 rounded-full grid place-items-center font-mono font-bold text-sm text-[#0B0F19] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}
              aria-hidden="true"
            >
              {r.userName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-1.5">
                <span className="font-display font-semibold text-[13.5px]">{r.userName}</span>
                <span className="flex gap-0.5" aria-label={`${r.rating} trên 5 sao`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'fill-accent text-accent' : 'text-line')} aria-hidden="true" />
                  ))}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {new Date(r.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
              {r.comment && <p className="text-[13.5px] text-ink-2 leading-[1.7]">{r.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Write/Edit review section (UC18) ───────────────────────────── */
function WriteReviewSection({ courseId }) {
  const queryClient = useQueryClient();
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [comment, setComment] = useState('');

  const { data: myData } = useQuery({
    queryKey: ['my-review', courseId],
    queryFn: () => api.get(`/api/courses/${courseId}/reviews/me`).then(r => r.data),
    staleTime: 60_000,
  });
  const existing = myData?.review ?? null;

  // Pre-fill form when existing review loads
  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment ?? '');
    }
  }, [existing?.rating, existing?.comment]); // eslint-disable-line

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-review', courseId] });
    queryClient.invalidateQueries({ queryKey: ['course'] });
  };

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/api/courses/${courseId}/reviews`, { rating, comment }),
    onSuccess: () => { toast.success('Đánh giá đã được lưu!'); invalidate(); },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/courses/${courseId}/reviews/me`),
    onSuccess: () => {
      toast.success('Đã xóa đánh giá');
      setRating(0); setComment('');
      invalidate();
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <div className="card p-6 mb-6 border-accent/20 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse at 0% 0%, rgb(var(--accent) / .05) 0%, transparent 55%)' }}
      />
      <div className="relative">
        <h3 className="font-display font-semibold text-[15px] mb-4">
          {existing ? 'Đánh giá của bạn' : 'Viết đánh giá'}
        </h3>

        {/* Star picker */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              aria-label={`${s} sao`}
              className="cursor-pointer"
            >
              <Star className={cn(
                'w-7 h-7 transition-colors',
                s <= (hover || rating) ? 'fill-accent text-accent' : 'text-line hover:text-ink-3',
              )} />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 font-mono text-[12px] text-accent self-center">
              {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][rating]}
            </span>
          )}
        </div>

        <label htmlFor="review-comment" className="sr-only">Nội dung đánh giá</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Chia sẻ trải nghiệm của bạn về khóa học..."
          className="w-full px-3.5 py-3 text-[13.5px] bg-bg border border-line rounded-xl text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none transition-colors mb-3"
        />

        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-ink-3">{comment.length}/1000</span>
          <div className="flex gap-2">
            {existing && (
              <Button size="sm" variant="ghost"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Xóa
              </Button>
            )}
            <Button size="sm"
              disabled={rating === 0 || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}>
              {existing ? 'Cập nhật' : 'Gửi đánh giá'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Preview modal (UC04) ────────────────────────────────────────── */
function PreviewModal({ lesson, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem thử: ${lesson.title}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[760px] bg-bg rounded-2xl border border-line overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <div>
            <p className="font-mono text-[11px] text-accent uppercase tracking-wide mb-0.5">● Preview miễn phí</p>
            <p className="font-display font-semibold text-[14px] text-ink">{lesson.title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-lg border border-line text-ink-3 hover:text-ink hover:bg-bg-2 grid place-items-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {lesson.video_url ? (
            <ReactPlayer
              url={lesson.video_url}
              width="100%" height="100%"
              controls playing
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full border-2 border-line grid place-items-center">
                <Play className="w-7 h-7 text-ink-3" aria-hidden="true" />
              </div>
              <p className="font-mono text-[13px] text-ink-3">Video chưa sẵn sàng</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="font-mono text-[12px] text-ink-3">
            {lesson.duration_minutes ? `${lesson.duration_minutes} phút` : ''}
          </span>
          <span className="font-mono text-[11.5px] text-ink-3">Mua khóa học để mở toàn bộ bài học</span>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function CourseDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 animate-pulse motion-reduce:animate-none" aria-hidden="true">
      <div className="lg:grid lg:grid-cols-[1fr_330px] lg:gap-12">
        <div className="space-y-4">
          <div className="h-3 bg-bg-3 rounded w-1/4" />
          <div className="h-9 bg-bg-3 rounded w-3/4" />
          <div className="h-9 bg-bg-3 rounded w-1/2" />
          <div className="h-4 bg-bg-3 rounded w-full" />
          <div className="h-4 bg-bg-3 rounded w-2/3" />
          <div className="h-24 bg-bg-3 rounded-xl w-full mt-8" />
        </div>
        <div className="mt-10 lg:mt-0">
          <div className="aspect-video bg-bg-3 rounded-xl mb-4" />
          <div className="h-11 bg-bg-3 rounded-lg mb-2" />
          <div className="h-11 bg-bg-3 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
