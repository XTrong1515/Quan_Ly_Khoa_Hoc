import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CourseThumb } from './course-thumb.jsx';
import { Chip } from './ui/chip.jsx';
import { formatVND } from '@/lib/format';

export function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course.slug ?? course.id}`} className="card p-3 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg transition">
      <CourseThumb course={course} />
      <div className="px-1 pb-2">
        <div className="flex gap-2 mb-2">
          <Chip variant="line">{course.category}</Chip>
          <Chip variant="line">{course.level}</Chip>
        </div>
        <h3 className="font-display font-semibold text-[15.5px] tracking-tight2 mb-1 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-ink-3 text-xs mb-3">bởi {course.instructor}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-ink-2">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            <b className="text-ink">{course.rating}</b>
            <span className="text-ink-3">({(course.students / 1000).toFixed(1)}k)</span>
          </div>
          <div className={`font-mono font-bold text-[15px] ${course.price === 0 ? 'text-accent' : 'text-ink'}`}>
            {formatVND(course.price)}
          </div>
        </div>
      </div>
    </Link>
  );
}
