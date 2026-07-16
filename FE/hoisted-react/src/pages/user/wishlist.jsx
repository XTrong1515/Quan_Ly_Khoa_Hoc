import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Trash2, ShoppingCart, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, apiMessage } from '@/lib/api';
import { AccountShell } from '@/components/layout/account-shell.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { useCart } from '@/store/cart';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function WishlistPage() {
  const qc = useQueryClient();
  const { items, add } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/api/wishlists/me').then(r => r.data),
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (courseId) => api.delete(`/api/wishlists/${courseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-ids'] });
      toast.success('Đã xóa khỏi danh sách yêu thích');
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const courses = data?.courses ?? [];
  const cartIds = new Set(items.map((i) => i.courseId));

  return (
    <AccountShell title="Khóa học yêu thích" desc="Những khóa học bạn đã lưu lại để học sau">
      <Seo title="Khóa học yêu thích — Hoisted" />

      {isLoading && (
        <div className="space-y-3" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse motion-reduce:animate-none h-[104px]" />
          ))}
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="card relative overflow-hidden py-20 px-6 text-center">
          <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-60" aria-hidden="true" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger grid place-items-center mx-auto mb-5">
              <Heart className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="font-display font-bold text-[17px] mb-1.5">Danh sách yêu thích trống</h3>
            <p className="text-ink-2 text-[13.5px] mb-6">
              Bấm biểu tượng ♥ trên khóa học bất kỳ để lưu lại đây.
            </p>
            <Link to="/courses"><Button>Khám phá khóa học</Button></Link>
          </div>
        </div>
      )}

      {!isLoading && courses.length > 0 && (
        <>
          <p className="font-mono text-[12px] text-ink-3 mb-4">
            <b className="text-ink">{courses.length}</b> khóa học đã lưu
          </p>
          <div className="flex flex-col gap-3">
            {courses.map((c, i) => (
              <Reveal key={c.id} delay={i * 40}>
                <WishlistItem
                  course={c}
                  inCart={cartIds.has(c.id)}
                  onAddCart={() => { add(c.id); toast.success(`Đã thêm "${c.title}" vào giỏ`); }}
                  onRemove={() => removeMutation.mutate(c.id)}
                  removing={removeMutation.isPending}
                />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </AccountShell>
  );
}

function WishlistItem({ course, inCart, onAddCart, onRemove, removing }) {
  const isFree = Number(course.price) === 0;

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-accent/30 transition-colors">
      <Link to={`/courses/${course.slug}`} className="flex-shrink-0 w-full sm:w-36">
        <CourseThumb course={course} />
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/courses/${course.slug}`}>
          <h3 className="font-display font-semibold text-[14.5px] text-ink line-clamp-2 hover:text-accent transition-colors leading-snug">
            {course.title}
          </h3>
        </Link>
        <p className="font-mono text-[11.5px] text-ink-3 mt-1">bởi {course.instructor_name}</p>
        <p className={cn('font-mono font-bold text-[16px] mt-2', isFree ? 'text-accent' : 'text-ink')}>
          {formatVND(course.price)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isFree ? (
          <Link to={`/courses/${course.slug}`}>
            <Button size="sm" variant="ghost">Xem khóa học</Button>
          </Link>
        ) : inCart ? (
          <Link to="/cart">
            <Button size="sm" variant="ghost">
              <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" /> Trong giỏ
            </Button>
          </Link>
        ) : (
          <Button size="sm" onClick={onAddCart}>
            <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" /> Thêm vào giỏ
          </Button>
        )}
        <button
          onClick={onRemove}
          disabled={removing}
          aria-label={`Xóa "${course.title}" khỏi yêu thích`}
          className="w-9 h-9 rounded-lg border border-line grid place-items-center text-ink-3 hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
