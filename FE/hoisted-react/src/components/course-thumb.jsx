import { cn } from '@/lib/utils';
import { formatHours } from '@/lib/format';

// Màu phẳng bão hòa (pixel neo-brutalism) — không gradient. Ký hiệu navy hoặc trắng tùy độ sáng nền.
const SWATCHES = {
  yellow: { bg: 'bg-[#FFCF33]', ink: 'text-[#0E1B3D]' },
  indigo: { bg: 'bg-[#2547D0]', ink: 'text-white' },
  rose:   { bg: 'bg-[#F2542D]', ink: 'text-white' },
  green:  { bg: 'bg-[#1DB06B]', ink: 'text-[#0E1B3D]' },
  violet: { bg: 'bg-[#7B5CFA]', ink: 'text-white' },
  sky:    { bg: 'bg-[#29B6F6]', ink: 'text-[#0E1B3D]' },
};
const TAG = 'absolute top-2.5 left-2.5 bg-[#0E1B3D] border-2 border-[#0E1B3D] font-mono font-bold text-[10px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-sm';

/**
 * priority: ảnh là ứng viên LCP (ảnh bìa đầu trang chi tiết khóa học) → tải ngay với
 * fetchpriority="high"; mặc định lazy cho lưới thẻ khóa học dưới màn hình đầu.
 */
export function CourseThumb({ course, className, priority = false }) {
  const thumbUrl = course.thumbnail_url || course.thumbnailUrl;

  if (thumbUrl) {
    return (
      <div className={cn('relative aspect-video rounded-sm border-2 border-edge overflow-hidden bg-bg-3', className)}>
        <img
          src={thumbUrl}
          alt={course.title ?? ''}
          width="640"
          height="360"
          className="w-full h-full object-cover"
          {...(priority ? { fetchpriority: 'high' } : { loading: 'lazy' })}
        />
        {course.tag && (
          <span className={cn(TAG, course.tag === 'Free' ? 'text-[#FFCF33]' : 'text-white')}>
            {course.tag}
          </span>
        )}
      </div>
    );
  }

  const sw = SWATCHES[course.thumb] || SWATCHES.yellow;
  return (
    <div className={cn(
      'relative aspect-video rounded-sm border-2 border-edge overflow-hidden',
      sw.bg,
      className,
    )}>
      {/* lưới chấm pixel trên nền màu */}
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(#0E1B3D_1px,transparent_1.4px)] [background-size:12px_12px]" aria-hidden="true" />
      <div className={cn('absolute inset-0 grid place-items-center font-pixel font-extrabold text-[72px] leading-none [text-shadow:4px_4px_0_rgb(14_27_61/0.35)]', sw.ink)}>
        {/* Khóa chưa đặt ký hiệu → lấy chữ cái đầu của tên, không để ô màu trống */}
        {course.glyph || (course.title ?? '').trim().slice(0, 2).toUpperCase()}
      </div>
      <div className="absolute left-2.5 right-2.5 bottom-2.5 flex justify-between items-end font-mono font-bold text-[10.5px] text-[#0E1B3D]">
        {/* Một số payload (giỏ hàng…) không có số bài / thời lượng → không in "undefined lessons" hay "0.0h" */}
        {course.lessons != null ? <span className="bg-white border-2 border-[#0E1B3D] rounded-sm px-1.5">{course.lessons} bài học</span> : <span />}
        {Number(course.hours) > 0 ? <span className="bg-white border-2 border-[#0E1B3D] rounded-sm px-1.5">{formatHours(course.hours)}</span> : <span />}
      </div>
      {course.tag && (
        <span className={cn(TAG, course.tag === 'Free' ? 'text-[#FFCF33]' : 'text-white')}>{course.tag}</span>
      )}
    </div>
  );
}
