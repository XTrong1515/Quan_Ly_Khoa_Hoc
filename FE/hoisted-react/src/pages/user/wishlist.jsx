import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, apiMessage } from '@/lib/api';
import { CourseThumb } from '@/components/course-thumb.jsx';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function WishlistPage() {
  const qc = useQueryClient();

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1">// Của tôi</p>
        <h1 className="font-display font-bold text-[28px] flex items-center gap-2.5">
          <Heart className="w-6 h-6 text-danger fill-danger" />
          Khóa học yêu thích
        </h1>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-28 bg-bg-2" />
          ))}
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-ink-3 mx-auto mb-4" />
          <p className="font-mono text-[13px] text-ink-3 mb-6">// Chưa có khóa học nào trong danh sách yêu thích</p>
          <Link to="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-ink text-[13.5px] font-semibold hover:opacity-90 transition">
            Khám phá khóa học →
          </Link>
        </div>
      )}

      {!isLoading && courses.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] text-ink-3">{courses.length} khóa học</p>
          {courses.map(c => (
            <WishlistItem
              key={c.id}
              course={c}
              onRemove={() => removeMutation.mutate(c.id)}
              removing={removeMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistItem({ course, onRemove, removing }) {
  return (
    <div className="card p-4 flex items-center gap-4 group">
      <Link to={`/courses/${course.slug}`} className="shrink-0">
        <div className="w-16 h-16">
          <CourseThumb course={course} />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/courses/${course.slug}`}>
          <h3 className="font-semibold text-[14px] text-ink line-clamp-1 hover:text-accent transition-colors">
            {course.title}
          </h3>
        </Link>
        <p className="font-mono text-[11px] text-ink-3 mt-0.5">bởi {course.instructor_name}</p>
      </div>

      <div className="shrink-0 flex items-center gap-4">
        <p className={cn(
          'font-mono font-bold text-[15px]',
          course.price === 0 ? 'text-success' : 'text-ink',
        )}>
          {formatVND(course.price)}
        </p>
        <button
          onClick={onRemove}
          disabled={removing}
          className="p-1.5 rounded hover:bg-danger/10 text-ink-3 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
          title="Xóa khỏi yêu thích"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
