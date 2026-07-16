import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

function useReviews(params) {
  return useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => api.get('/api/admin/reviews', { params }).then(r => r.data),
    staleTime: 30_000,
  });
}

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [type, setType]     = useState('course');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);

  const params = { type, status, page, limit: 15 };
  const { data, isLoading } = useReviews(params);
  const reviews    = data?.reviews ?? [];
  const totalPages = data?.totalPages ?? 1;

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }) => api.put(`/api/admin/reviews/${id}/status`, { status: s, type }),
    onSuccess: () => { toast.success('Đã cập nhật trạng thái'); qc.invalidateQueries({ queryKey: ['admin-reviews'] }); },
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-6">
        <p className="eyebrow mb-1.5"><span className="text-accent">~/admin</span> <span className="text-ink-3">/ đánh-giá</span></p>
        <h1 className="font-display font-bold text-[24px]">Quản lý đánh giá</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 border border-line rounded-lg p-1 bg-bg-2">
          {[{ v: 'course', l: 'Khóa học' }, { v: 'site', l: 'Website' }].map(({ v, l }) => (
            <button key={v} onClick={() => { setType(v); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                type === v ? 'bg-bg text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
              )}>
              {l}
            </button>
          ))}
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-[13px] bg-bg border border-line rounded-lg text-ink focus:outline-none focus:border-accent">
          <option value="">Tất cả</option>
          <option value="VISIBLE">Hiển thị</option>
          <option value="HIDDEN">Đã ẩn</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && [1,2,3].map(i => (
          <div key={i} className="card p-4 animate-pulse h-24 bg-bg-3" />
        ))}

        {!isLoading && reviews.length === 0 && (
          <div className="py-16 text-center card">
            <p className="font-mono text-ink-3">// Không có đánh giá nào</p>
          </div>
        )}

        {reviews.map(r => (
          <div key={r.id} className={cn(
            'card p-4 flex gap-4',
            r.status === 'HIDDEN' && 'opacity-60',
          )}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full grid place-items-center font-mono font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #F7DF1E)', color: '#0B0F19' }}>
              {r.userName?.[0]?.toUpperCase() ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-semibold text-[13.5px] text-ink">{r.userName}</span>
                  <span className="font-mono text-[11px] text-ink-3 ml-2">{r.email}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status.toLowerCase()} />
                  <button
                    onClick={() => statusMutation.mutate({ id: r.id, status: r.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE' })}
                    disabled={statusMutation.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors',
                      r.status === 'VISIBLE'
                        ? 'bg-bg-2 text-ink-2 hover:bg-danger/10 hover:text-danger'
                        : 'bg-success/10 text-success hover:bg-success/20',
                    )}>
                    {r.status === 'VISIBLE'
                      ? <><EyeOff className="w-3.5 h-3.5" /> Ẩn</>
                      : <><Eye className="w-3.5 h-3.5" /> Hiện</>}
                  </button>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'fill-accent text-accent' : 'text-line')} />
                ))}
              </div>

              {/* Course link */}
              {r.courseTitle && (
                <p className="font-mono text-[11.5px] text-accent mb-1">
                  {r.courseTitle}
                </p>
              )}

              {/* Comment */}
              {r.comment && (
                <p className="text-[13px] text-ink-2 leading-relaxed">{r.comment}</p>
              )}

              <p className="font-mono text-[11px] text-ink-3 mt-1.5">
                {new Date(r.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</Button>
          <span className="font-mono text-[13px] text-ink-2">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
        </div>
      )}
    </div>
  );
}
