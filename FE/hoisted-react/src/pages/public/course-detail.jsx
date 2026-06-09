import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, Clock, BookOpen, Users, ChevronDown, Play,
  ShoppingCart, Zap, Check, X, Lock, Trash2, Gift,
} from 'lucide-react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { api, apiMessage } from '@/lib/api';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { formatVND, formatHours } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = ['Mô tả', 'Curriculum', 'Reviews', 'Giảng viên'];

function useCourseDetail(slug) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.get(`/api/courses/${slug}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export default function CourseDetailPage() {
  const { slug }         = useParams();
  const { role }       = useAuth();
  const { add, items } = useCart();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const [tab, setTab]    = useState('Mô tả');
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

  if (isLoading) return <CourseDetailSkeleton />;
  if (isError || !data?.course) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-ink-3 mb-3">// 404</p>
        <p className="text-ink-2 mb-4">Không tìm thấy khóa học.</p>
        <Link to="/courses"><Button variant="ghost">← Quay lại danh sách</Button></Link>
      </div>
    );
  }

  const { course, lessons = [], reviews = [], isEnrolled = false } = data;
  const isFree = parseFloat(course.price) === 0;
  const inCart = items.some((i) => i.courseId === course.id);

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

  return (
    <>
      {/* Preview modal (UC04) */}
      {previewLesson && (
        <PreviewModal lesson={previewLesson} onClose={() => setPreviewLesson(null)} />
      )}

      <div className="max-w-[1200px] mx-auto px-8 py-10">
        <div className="flex gap-10 items-start">
          {/* Left: main content */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 font-mono text-[12px] text-ink-3 mb-4">
              <Link to="/courses" className="hover:text-ink">Khóa học</Link>
              <span>/</span>
              <span className="text-ink-2">{course.category}</span>
            </div>

            {/* Hero */}
            <div className="flex gap-2 mb-3">
              <Chip variant="line">{course.category}</Chip>
              <Chip variant="line">{course.level}</Chip>
              {course.tag && <Chip>{course.tag}</Chip>}
            </div>
            <h1 className="display text-[36px] leading-tight mb-3">{course.title}</h1>
            <p className="text-ink-2 text-[15px] leading-relaxed mb-5">{course.short_description}</p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-[13px] text-ink-2 mb-6">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-accent text-accent" />
                <b className="text-ink">{course.rating}</b>
                <span className="text-ink-3">({course.review_count?.toLocaleString()} reviews)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-ink-3" />
                {course.students?.toLocaleString()} học viên
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-3" />
                {formatHours(course.hours ?? 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-ink-3" />
                {course.lessons} bài học
              </span>
            </div>

            <p className="text-[13px] text-ink-3 mb-6">
              Giảng viên: <span className="text-ink font-semibold">{course.instructor}</span>
            </p>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-line mb-6">
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn(
                    'px-4 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px transition-colors',
                    tab === t
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                  )}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {tab === 'Mô tả' && (
              <div
                className="prose prose-sm max-w-none text-ink-2 [&_h3]:text-ink [&_h3]:font-display [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: course.description || course.short_description }}
              />
            )}

            {tab === 'Curriculum' && (
              <div className="space-y-2">
                {Object.entries(sections).length === 0 ? (
                  <p className="text-ink-3 font-mono text-sm">// chưa có bài học</p>
                ) : (
                  Object.entries(sections).map(([sectionTitle, sectionLessons]) => (
                    <SectionAccordion
                      key={sectionTitle}
                      title={sectionTitle}
                      lessons={sectionLessons}
                      isEnrolled={isEnrolled}
                      onPreview={setPreviewLesson}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'Reviews' && (
              <>
                {isEnrolled && (
                  <WriteReviewSection courseId={course.id} />
                )}
                <ReviewsList reviews={reviews} course={course} />
              </>
            )}

            {tab === 'Giảng viên' && (
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full grid place-items-center font-mono font-bold text-lg text-[#0B0F19] shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
                  {course.instructor?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-semibold text-[17px] mb-1">{course.instructor}</p>
                  <p className="text-ink-3 text-[13px]">Senior JavaScript Engineer</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: sticky sidebar */}
          <aside className="w-[300px] shrink-0 sticky top-20 self-start">
            <div className="card overflow-hidden">
              <CourseThumb course={course} className="rounded-none" />
              <div className="p-5">
                <div className="flex items-end gap-2.5 mb-4">
                  <span className="font-mono font-bold text-[26px] text-ink">
                    {formatVND(course.price)}
                  </span>
                  {course.originalPrice > course.price && (
                    <span className="font-mono text-[15px] text-ink-3 line-through mb-0.5">
                      {formatVND(course.originalPrice)}
                    </span>
                  )}
                  {course.originalPrice > course.price && (
                    <span className="font-mono text-[12px] text-success font-semibold mb-0.5">
                      -{Math.round((1 - course.price / course.originalPrice) * 100)}%
                    </span>
                  )}
                </div>

                {isEnrolled ? (
                  <Button size="lg" className="w-full justify-center mb-2" onClick={handleGoLearn}>
                    <Play className="w-4 h-4" /> Tiếp tục học
                  </Button>
                ) : isFree ? (
                  <Button
                    size="lg"
                    className="w-full justify-center mb-2"
                    disabled={enrollFreeMutation.isPending}
                    onClick={handleEnrollFree}>
                    <Gift className="w-4 h-4" />
                    {enrollFreeMutation.isPending ? 'Đang đăng ký…' : 'Đăng ký miễn phí'}
                  </Button>
                ) : (
                  <>
                    {inCart ? (
                      <Link to="/cart" className="block mb-2">
                        <Button size="lg" className="w-full justify-center">
                          <ShoppingCart className="w-4 h-4" /> Xem giỏ hàng →
                        </Button>
                      </Link>
                    ) : (
                      <Button size="lg" className="w-full justify-center mb-2" onClick={handleAddCart}>
                        <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ
                      </Button>
                    )}
                    {!inCart && (
                      <Button size="lg" variant="ghost" className="w-full justify-center" onClick={handleBuyNow}>
                        <Zap className="w-4 h-4" /> Mua ngay
                      </Button>
                    )}
                  </>
                )}

                <div className="mt-4 space-y-2 text-[12.5px] text-ink-3 font-mono">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /> {course.lessons} bài học video</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /> {formatHours(course.hours ?? 0)} tổng thời lượng</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /> Truy cập trọn đời</div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /> Certificate khi hoàn thành</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ── Section Accordion (curriculum tab) ────────────────────────── */
function SectionAccordion({ title, lessons, isEnrolled, onPreview }) {
  const [open, setOpen] = useState(true);
  const totalMin = lessons.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-2 hover:bg-bg-3 transition text-left gap-2">
        <span className="font-semibold text-[13.5px] text-ink">{title}</span>
        <div className="flex items-center gap-3 text-ink-3 font-mono text-[11.5px] shrink-0">
          <span>{lessons.length} bài • {Math.round(totalMin / 60 * 10) / 10}h</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="divide-y divide-line">
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-2 transition">
              {l.is_preview ? (
                <button
                  onClick={() => onPreview(l)}
                  className="flex items-center gap-1.5 text-accent font-mono text-[11.5px] hover:underline shrink-0">
                  <Play className="w-3.5 h-3.5" /> Preview
                </button>
              ) : isEnrolled ? (
                <Play className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-ink-3 shrink-0" />
              )}
              <span className="flex-1 text-[13px] text-ink-2">{l.title}</span>
              {l.duration_minutes > 0 && (
                <span className="font-mono text-[11.5px] text-ink-3 shrink-0">
                  {l.duration_minutes}m
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reviews list ────────────────────────────────────────────────── */
function ReviewsList({ reviews, course }) {
  if (!reviews.length) {
    return (
      <div className="py-8 text-center">
        <p className="font-mono text-ink-3 text-sm">// chưa có đánh giá nào</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6 p-4 bg-bg-2 rounded-xl">
        <div className="text-center">
          <div className="font-mono font-bold text-[42px] text-ink leading-none">{course.rating}</div>
          <div className="flex gap-0.5 mt-1 justify-center">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(course.rating) ? 'fill-accent text-accent' : 'text-line')} />
            ))}
          </div>
          <div className="font-mono text-[11px] text-ink-3 mt-1">Điểm tổng</div>
        </div>
      </div>
      {reviews.map((r) => (
        <div key={r.id} className="flex gap-3">
          <div className="w-9 h-9 rounded-full grid place-items-center font-mono font-bold text-sm text-[#0B0F19] shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)' }}>
            {r.userName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[13.5px]">{r.userName}</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'fill-accent text-accent' : 'text-line')} />
                ))}
              </div>
              <span className="font-mono text-[11px] text-ink-3">
                {new Date(r.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
            {r.comment && <p className="text-[13.5px] text-ink-2 leading-relaxed">{r.comment}</p>}
          </div>
        </div>
      ))}
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
  }, [existing?.rating, existing?.comment]);

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
    <div className="mb-8 p-5 border border-line rounded-xl bg-bg-2">
      <h3 className="font-semibold text-[15px] mb-4">
        {existing ? 'Đánh giá của bạn' : 'Viết đánh giá'}
      </h3>

      {/* Star picker */}
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}>
            <Star className={cn(
              'w-6 h-6 transition-colors',
              s <= (hover || rating) ? 'fill-accent text-accent' : 'text-line',
            )} />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 font-mono text-[12px] text-ink-3 self-center">
            {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][rating]}
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Chia sẻ trải nghiệm của bạn về khóa học..."
        className="w-full px-3 py-2.5 text-[13.5px] bg-bg border border-line rounded-lg text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none transition-colors mb-3"
      />

      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-ink-3">{comment.length}/1000</span>
        <div className="flex gap-2">
          {existing && (
            <Button size="sm" variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}>
              <Trash2 className="w-3.5 h-3.5" /> Xóa
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
  );
}

/* ── Preview modal (UC04) ────────────────────────────────────────── */
function PreviewModal({ lesson, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,15,25,0.85)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[760px] bg-bg rounded-xl border border-line overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div>
            <p className="font-mono text-[11px] text-accent uppercase tracking-wide mb-0.5">Preview miễn phí</p>
            <p className="font-semibold text-[14px] text-ink">{lesson.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-line text-ink-3 hover:text-ink hover:bg-bg-2 grid place-items-center transition">
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
                <Play className="w-7 h-7 text-ink-3" />
              </div>
              <p className="font-mono text-[13px] text-ink-3">Video chưa sẵn sàng</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-mono text-[12px] text-ink-3">
            {lesson.duration_minutes ? `${lesson.duration_minutes} phút` : ''}
          </span>
          <span className="font-mono text-[11.5px] text-accent">● preview</span>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function CourseDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10 animate-pulse">
      <div className="flex gap-10 items-start">
        <div className="flex-1 space-y-4">
          <div className="h-3 bg-bg-3 rounded w-1/4" />
          <div className="h-8 bg-bg-3 rounded w-3/4" />
          <div className="h-8 bg-bg-3 rounded w-1/2" />
          <div className="h-4 bg-bg-3 rounded w-full" />
          <div className="h-4 bg-bg-3 rounded w-2/3" />
        </div>
        <div className="w-[300px] shrink-0">
          <div className="aspect-video bg-bg-3 rounded-lg mb-4" />
          <div className="h-10 bg-bg-3 rounded mb-2" />
          <div className="h-10 bg-bg-3 rounded" />
        </div>
      </div>
    </div>
  );
}
