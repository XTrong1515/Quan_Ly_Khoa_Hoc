import { cn } from '@/lib/utils';

const GRADIENTS = {
  yellow: 'from-[#F7DF1E] to-[#F59E0B]',
  indigo: 'from-[#6366F1] to-[#312E81]',
  rose:   'from-[#F43F5E] to-[#7F1D1D]',
  green:  'from-[#34D399] to-[#064E3B]',
  violet: 'from-[#A78BFA] to-[#4C1D95]',
  sky:    'from-[#38BDF8] to-[#0C4A6E]',
};

export function CourseThumb({ course, className }) {
  const thumbUrl = course.thumbnail_url || course.thumbnailUrl;

  if (thumbUrl) {
    return (
      <div className={cn('relative aspect-video rounded-[10px] overflow-hidden bg-bg-3', className)}>
        <img
          src={thumbUrl}
          alt={course.title ?? ''}
          className="w-full h-full object-cover"
          loading="lazy"
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
        {course.glyph}
      </div>
      <div className="absolute left-3 right-3 bottom-2.5 flex justify-between items-end font-mono font-semibold text-[11px] text-black/65">
        <span>{course.lessons} lessons</span>
        <span>{course.hours}h</span>
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
