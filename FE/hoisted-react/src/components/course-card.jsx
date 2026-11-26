import { Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseThumb } from './course-thumb.jsx';
import { Chip } from './ui/chip.jsx';
import { formatPrice, compactCount, hasRating, levelLabel } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useWishlistIds, useWishlistToggle } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

export function CourseCard({ course }) {
  const { role } = useAuth();
  const { data: wishlistIds = [] } = useWishlistIds();
  const toggle = useWishlistToggle();
  const isWishlisted = wishlistIds.includes(course.id);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (role === 'guest') return;
    toggle.mutate({ courseId: course.id, isWishlisted });
  };

  return (
    <Link
      to={`/courses/${course.slug ?? course.id}`}
      className="card h-full p-3 flex flex-col gap-3 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-xl transition relative group"
    >
      <CourseThumb course={course} />

      {/* Wishlist heart — only for logged-in users */}
      {role !== 'guest' && (
        <button
          onClick={handleWishlist}
          disabled={toggle.isPending}
          className={cn(
            'absolute top-5 right-5 w-8 h-8 rounded-sm border-2 border-edge bg-bg-1 shadow-sm grid place-items-center transition-all',
            'opacity-0 group-hover:opacity-100',
            isWishlisted && 'opacity-100',
          )}
          title={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
          aria-label={isWishlisted ? `Xóa "${course.title}" khỏi yêu thích` : `Thêm "${course.title}" vào yêu thích`}
          aria-pressed={isWishlisted}
        >
          <Heart className={cn(
            'w-3.5 h-3.5 transition-colors',
            isWishlisted ? 'fill-danger text-danger' : 'text-ink-3',
          )} />
        </button>
      )}

      {/* Thân thẻ giãn hết chiều cao ô lưới; tiêu đề luôn chiếm 2 dòng, hàng giá bám đáy → các thẻ cùng hàng thẳng nhau */}
      <div className="px-1 pb-1 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-2">
          <Chip variant="line">{course.category}</Chip>
          <Chip variant="line">{levelLabel(course.level)}</Chip>
        </div>
        <h3 className="font-display font-bold text-[15.5px] leading-[1.4] sm:min-h-[2.8em] tracking-tight2 mb-1 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-ink-3 text-xs mb-3 truncate">bởi {course.instructor}</p>
        <div className="mt-auto pt-3 border-t-2 border-dashed border-line flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-2 min-w-0">
            {hasRating(course) ? (
              <>
                <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                <b className="text-ink">{Number(course.rating).toFixed(1)}</b>
                <span className="text-ink-3">({compactCount(course.review_count)})</span>
              </>
            ) : (
              <span className="text-ink-3">Chưa có đánh giá</span>
            )}
            <span className="text-ink-3 whitespace-nowrap">· {compactCount(course.students)} học viên</span>
          </div>
          {/* Cùng một khối (viền 2px, cao 24px) cho cả giá và "Miễn phí" để hàng không nhảy chiều cao */}
          <div className={cn('font-mono font-bold text-[13.5px] leading-5 tabular-nums shrink-0 border-2 rounded-sm px-1.5',
            Number(course.price) === 0 ? 'bg-success text-success-ink border-edge' : 'bg-pop text-pop-ink border-edge')}>
            {formatPrice(course.price)}
          </div>
        </div>
      </div>
    </Link>
  );
}
