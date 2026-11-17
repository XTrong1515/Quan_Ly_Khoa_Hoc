import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/format';

const GRADIENTS = {
  yellow: 'from-[#F7DF1E] to-[#F59E0B]',
  indigo: 'from-[#6366F1] to-[#312E81]',
  rose:   'from-[#F43F5E] to-[#7F1D1D]',
  green:  'from-[#34D399] to-[#064E3B]',
  violet: 'from-[#A78BFA] to-[#4C1D95]',
  sky:    'from-[#38BDF8] to-[#0C4A6E]',
};

/**
 * priority: ảnh là ứng viên LCP (ảnh bìa đầu trang chi tiết khóa học) → tải ngay với
 * fetchpriority="high"; mặc định lazy cho lưới thẻ khóa học dưới màn hình đầu.
 */
export function CourseThumb({ course, className, priority = false }) {
  const thumbUrl = course.thumbnail_url || course.thumbnailUrl;

  if (thumbUrl) {
    return (
      <div className={cn('relative aspect-video rounded-[10px] overflow-hidden bg-bg-3', className)}>
        <img
          src={thumbUrl}
          alt={course.title ?? ''}
          width="640"
          height="360"
          className="w-full h-full object-cover"
          {...(priority ? { fetchpriority: 'high' } : { loading: 'lazy' })}
        />
        {course.tag && (
          <span className={cn(
            'absolute top-2.5 left-2.5 bg-[#0B0F19] font-mono font-semibold text-[10px] uppercase tracking-[0.06em] px-2 py-1 rounded',
            course.tag === 'Free' ? 'text-accent' : 'text-white',
          )}>
            {course.tag}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'relative aspect-video rounded-[10px] overflow-hidden bg-gradient-to-br',
      GRADIENTS[course.thumb] || GRADIENTS.yellow,
      className,
    )}>
      <div className="absolute inset-0 grid place-items-center font-mono font-extrabold text-[64px] leading-none text-black/30 tracking-tighter">
        {/* Khóa chưa đặt ký hiệu → lấy chữ cái đầu của tên, không để ô màu trống */}
        {course.glyph || (course.title ?? '').trim().slice(0, 2).toUpperCase()}
      </div>
      <div className="absolute left-3 right-3 bottom-2.5 flex justify-between items-end font-mono font-semibold text-[11px] text-black/65">
        {/* Một số payload (giỏ hàng…) không có số bài / thời lượng → không in "undefined lessons" hay "0.0h" */}
        <span>{course.lessons != null ? `${course.lessons} bài học` : ''}</span>
        <span>{Number(course.hours) > 0 ? formatHours(course.hours) : ''}</span>
      </div>
      {course.tag && (
        <span className={cn(
          'absolute top-2.5 left-2.5 bg-[#0B0F19] font-mono font-semibold text-[10px] uppercase tracking-[0.06em] px-2 py-1 rounded',
          course.tag === 'Free' ? 'text-accent' : 'text-white',
        )}>{course.tag}</span>
      )}
    </div>
  );
}
