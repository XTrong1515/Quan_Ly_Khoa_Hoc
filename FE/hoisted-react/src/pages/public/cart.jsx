import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, ShoppingCart, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { Chip } from '@/components/ui/chip.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';

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

  // Map course id → course data
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

  const hasOwnedItem = courseIds.some((id) => enrolledSet.has(id));
  const total = courseIds
    .filter((id) => !enrolledSet.has(id))
    .reduce((sum, id) => sum + (courseMap[id]?.price ?? 0), 0);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post('/api/orders', { courseIds: courseIds.filter((id) => !enrolledSet.has(id)) }).then((r) => r.data),
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
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-bg-2 grid place-items-center mx-auto mb-5">
          <ShoppingCart className="w-7 h-7 text-ink-3" />
        </div>
        <p className="eyebrow mb-2">// giỏ hàng</p>
        <h1 className="display text-2xl mb-3">Giỏ hàng trống</h1>
        <p className="text-ink-2 mb-6">Hãy khám phá các khóa học và thêm vào giỏ hàng.</p>
        <Link to="/courses"><Button>Khám phá khóa học</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10">
      <p className="eyebrow mb-2">// giỏ hàng</p>
      <h1 className="display text-[32px] mb-8">Giỏ hàng ({courseIds.length})</h1>

      {hasOwnedItem && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-6 bg-warning/10 border border-warning/30 rounded-lg text-[13px] text-ink-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>Giỏ hàng có khóa học bạn đã sở hữu. Vui lòng xóa chúng trước khi thanh toán.</span>
        </div>
      )}

      <div className="flex gap-8 items-start">
        {/* Course list */}
        <div className="flex-1 min-w-0 space-y-4">
          {courseIds.map((id) => {
            const course   = courseMap[id];
            const isOwned  = enrolledSet.has(id);

            if (isLoading || !course) {
              return (
                <div key={id} className="card p-4 animate-pulse flex gap-4">
                  <div className="w-32 aspect-video rounded-lg bg-bg-3 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-3 rounded w-3/4" />
                    <div className="h-3 bg-bg-3 rounded w-1/2" />
                  </div>
                </div>
              );
            }

            return (
              <div key={id}
                className={`card p-4 flex gap-4 items-start ${isOwned ? 'opacity-70 ring-1 ring-warning/40' : ''}`}>
                <div className="w-32 shrink-0">
                  <CourseThumb course={course} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 mb-1.5 flex-wrap">
                    <Chip variant="line" className="text-[11px]">{course.instructor}</Chip>
                    {isOwned && (
                      <Chip className="text-[11px] bg-warning/15 text-warning border-warning/30">
                        Đã sở hữu
                      </Chip>
                    )}
                  </div>
                  <Link to={`/courses/${course.slug}`}
                    className="font-display font-semibold text-[15px] hover:text-accent line-clamp-2 block mb-1">
                    {course.title}
                  </Link>
                  {isOwned ? (
                    <p className="font-mono text-[12.5px] text-warning">
                      Bạn đã đăng ký khóa học này
                    </p>
                  ) : (
                    <p className="font-mono font-bold text-[17px] text-ink mt-auto">
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
                  className="text-ink-3 hover:text-danger transition p-1 rounded"
                  title="Xóa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="w-[300px] shrink-0 sticky top-24">
          <div className="card p-5">
            <h2 className="font-display font-semibold text-[17px] mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-2 mb-4">
              {courseIds.filter((id) => !enrolledSet.has(id)).map((id) => {
                const c = courseMap[id];
                return (
                  <div key={id} className="flex justify-between text-[13px]">
                    <span className="text-ink-2 truncate flex-1 mr-2">{c?.title ?? '…'}</span>
                    <span className="font-mono text-ink shrink-0">{formatVND(c?.price ?? 0)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line pt-3 mb-5 flex justify-between">
              <span className="font-semibold text-ink">Tổng cộng</span>
              <span className="font-mono font-bold text-[20px] text-ink">{formatVND(total)}</span>
            </div>

            <Button
              size="lg"
              className="w-full justify-center"
              disabled={checkoutMutation.isPending || isLoading || hasOwnedItem}
              onClick={handleCheckout}>
              {checkoutMutation.isPending ? 'Đang xử lý…' : (
                <>
                  {role === 'guest' ? <Lock className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  {role === 'guest' ? 'Đăng nhập để thanh toán' : 'Tiến hành thanh toán'}
                </>
              )}
            </Button>

            <p className="font-mono text-[11px] text-ink-3 text-center mt-3">
              Thanh toán qua VNPay • Bảo mật SSL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
