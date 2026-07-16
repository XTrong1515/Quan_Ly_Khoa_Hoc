import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, ShoppingCart, ArrowRight, Lock, AlertCircle, ShieldCheck, Infinity as InfinityIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

function useCartCourses(ids) {
  return useQuery({
    queryKey: ['cart-courses', ids],
    queryFn: () =>
      ids.length > 0
        ? api.get('/api/courses/cart-items', { params: { ids: ids.join(',') } }).then((r) => r.data.courses)
        : Promise.resolve([]),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

function useEnrolledCourseIds(enabled) {
  return useQuery({
    queryKey: ['enrolled-course-ids'],
    queryFn: () => api.get('/api/enrollments/me/course-ids').then((r) => r.data.courseIds),
    enabled,
    staleTime: 60_000,
  });
}

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { role } = useAuth();
  const navigate  = useNavigate();

  const courseIds = items.map((i) => i.courseId);
  const { data: courses = [], isLoading } = useCartCourses(courseIds);
  const { data: enrolledIds = [] } = useEnrolledCourseIds(role !== 'guest');

  const enrolledSet = new Set(enrolledIds);
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

  const payableIds = courseIds.filter((id) => !enrolledSet.has(id));
  const hasOwnedItem = courseIds.some((id) => enrolledSet.has(id));
  const total = payableIds.reduce((sum, id) => sum + (courseMap[id]?.price ?? 0), 0);
  const originalTotal = payableIds.reduce(
    (sum, id) => sum + Math.max(courseMap[id]?.originalPrice ?? 0, courseMap[id]?.price ?? 0),
    0,
  );
  const savings = Math.max(0, originalTotal - total);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post('/api/orders', { courseIds: payableIds }).then((r) => r.data),
    onSuccess: ({ orderId }) => {
      clear();
      navigate(`/payment/pending/${orderId}`);
    },
    onError: (err) => toast.error(apiMessage(err, 'Thanh toán thất bại')),
  });

  const handleCheckout = () => {
    if (role === 'guest') {
      toast.error('Vui lòng đăng nhập để thanh toán');
      navigate('/login');
      return;
    }
    checkoutMutation.mutate();
  };

  if (courseIds.length === 0) {
    return (
      <>
        <Seo title="Giỏ hàng — Hoisted" />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-2xl mx-auto px-6 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-6">
              <ShoppingCart className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="eyebrow mb-2">
              <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ giỏ-hàng</span>
            </p>
            <h1 className="display text-[28px] mb-3">Giỏ hàng trống</h1>
            <p className="text-ink-2 mb-7">Hãy khám phá các khóa học và thêm vào giỏ hàng.</p>
            <Link to="/courses"><Button size="lg">Khám phá khóa học</Button></Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={`Giỏ hàng (${courseIds.length}) — Hoisted`} />

      {/* Header band */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-bg-2" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(ellipse 45% 90% at 15% 0%, rgb(var(--accent) / .10) 0%, transparent 60%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 py-10">
          <p className="eyebrow mb-2">
            <span className="text-accent">~/hoisted</span> <span className="text-ink-3">/ giỏ-hàng</span>
          </p>
          <h1 className="display text-[28px] sm:text-[34px]">
            Giỏ hàng
            <span className="font-mono text-accent text-[20px] sm:text-[24px] ml-3 align-middle">
              [{courseIds.length}]
            </span>
          </h1>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-8">
        {hasOwnedItem && (
          <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-warning/10 border border-warning/30 rounded-xl text-[13px] text-ink-2" role="alert">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <span>Giỏ hàng có khóa học bạn đã sở hữu. Vui lòng xóa chúng trước khi thanh toán.</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Course list */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {courseIds.map((id, i) => {
              const course   = courseMap[id];
              const isOwned  = enrolledSet.has(id);

              if (isLoading || !course) {
                return (
                  <div key={id} className="card p-4 animate-pulse motion-reduce:animate-none flex gap-4" aria-hidden="true">
                    <div className="w-32 aspect-video rounded-lg bg-bg-3 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-bg-3 rounded w-3/4" />
                      <div className="h-3 bg-bg-3 rounded w-1/2" />
                    </div>
                  </div>
                );
              }

              return (
                <Reveal key={id} delay={i * 40}>
                  <div className={cn(
                    'card p-4 flex flex-col sm:flex-row gap-4 items-start transition-colors',
                    isOwned ? 'opacity-70 ring-1 ring-warning/40' : 'hover:border-accent/30',
                  )}>
                    <Link to={`/courses/${course.slug}`} className="w-full sm:w-36 shrink-0">
                      <CourseThumb course={course} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-1.5 flex-wrap">
                        <Chip variant="line" className="text-[11px]">{course.instructor}</Chip>
                        {isOwned && (
                          <Chip className="text-[11px] bg-warning/15 text-warning border-warning/30">
                            Đã sở hữu
                          </Chip>
                        )}
                      </div>
                      <Link
                        to={`/courses/${course.slug}`}
                        className="font-display font-semibold text-[15px] hover:text-accent transition-colors line-clamp-2 block mb-1.5"
                      >
                        {course.title}
                      </Link>
                      {isOwned ? (
                        <p className="font-mono text-[12.5px] text-warning">
                          Bạn đã đăng ký khóa học này
                        </p>
                      ) : (
                        <p className="font-mono font-bold text-[17px] text-ink">
                          {formatVND(course.price)}
                          {course.originalPrice > course.price && (
                            <span className="text-[13px] text-ink-3 font-normal line-through ml-2">
                              {formatVND(course.originalPrice)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { remove(id); toast.success('Đã xóa khỏi giỏ hàng'); }}
                      aria-label={`Xóa "${course.title}" khỏi giỏ hàng`}
                      className="w-9 h-9 rounded-lg border border-line grid place-items-center text-ink-3 hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-colors cursor-pointer self-end sm:self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Order summary */}
          <aside className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-24">
            <div className="card p-6 shadow-xl shadow-black/10">
              <h2 className="font-display font-semibold text-[17px] mb-5">Tóm tắt đơn hàng</h2>

              <div className="space-y-2.5 mb-4">
                {payableIds.map((id) => {
                  const c = courseMap[id];
                  return (
                    <div key={id} className="flex justify-between gap-3 text-[13px]">
                      <span className="text-ink-2 truncate flex-1">{c?.title ?? '…'}</span>
                      <span className="font-mono text-ink shrink-0 tabular-nums">{formatVND(c?.price ?? 0)}</span>
                    </div>
                  );
                })}
              </div>

              {savings > 0 && (
                <div className="flex justify-between text-[13px] pb-3 mb-3 border-b border-line">
                  <span className="text-ink-3">Tiết kiệm</span>
                  <span className="font-mono text-success font-semibold tabular-nums">−{formatVND(savings)}</span>
                </div>
              )}

              <div className="border-t border-line pt-4 mb-5 flex items-end justify-between">
                <span className="font-semibold text-ink">Tổng cộng</span>
                <span className="font-mono font-bold text-[24px] text-ink leading-none tabular-nums">
                  {formatVND(total)}
                </span>
              </div>

              <Button
                size="lg"
                className={cn(
                  'w-full justify-center',
                  !hasOwnedItem && !isLoading && 'shadow-[0_8px_24px_rgb(var(--accent)/0.3)]',
                )}
                disabled={checkoutMutation.isPending || isLoading || hasOwnedItem}
                onClick={handleCheckout}
              >
                {checkoutMutation.isPending ? 'Đang xử lý…' : (
                  <>
                    {role === 'guest' ? <Lock className="w-4 h-4" aria-hidden="true" /> : <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                    {role === 'guest' ? 'Đăng nhập để thanh toán' : 'Tiến hành thanh toán'}
                  </>
                )}
              </Button>

              <ul className="mt-5 pt-4 border-t border-line space-y-2 text-[12px] text-ink-3">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" aria-hidden="true" />
                  Thanh toán qua VNPay · Bảo mật SSL
                </li>
                <li className="flex items-center gap-2">
                  <InfinityIcon className="w-3.5 h-3.5 text-accent flex-shrink-0" aria-hidden="true" />
                  Truy cập trọn đời sau khi thanh toán
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
