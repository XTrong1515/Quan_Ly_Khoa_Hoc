import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Star, Layers, ArrowRight, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

const STATUS_ORDER = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'];

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: () => api.get('/api/instructor/dashboard').then(r => r.data),
    staleTime: 30_000,
  });
  const { data: coursesData } = useQuery({
    queryKey: ['instructor-courses', { search: '', status: '' }],
    queryFn: () => api.get('/api/instructor/courses').then(r => r.data),
    staleTime: 30_000,
  });

  const counts  = data?.statusCounts ?? {};
  const total   = Object.values(counts).reduce((a, b) => a + b, 0);
  const attention = (coursesData?.courses ?? []).filter(c => ['REJECTED', 'DRAFT'].includes(c.status)).slice(0, 5);

  const stats = [
    { label: 'Khóa học',      value: total,               icon: BookOpen },
    { label: 'Học viên',      value: data?.students ?? 0, icon: Users },
    { label: 'Bài học',       value: data?.lessons ?? 0,  icon: Layers },
    { label: 'Đánh giá TB',   value: data?.avgRating ?? '—', icon: Star },
  ];

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ tổng-quan</span></p>
          <h1 className="font-display font-bold text-[24px]">Xin chào, {user?.name ?? 'giảng viên'}</h1>
        </div>
        <Link to="/instructor/courses"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> Quản lý khóa học
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">{label}</p>
            </div>
            <p className="font-mono font-bold text-[24px] text-ink leading-none tabular-nums">
              {isLoading ? '…' : Number.isFinite(Number(value)) ? Number(value).toLocaleString('vi-VN') : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em] mb-4">Trạng thái khóa học</p>
          <div className="space-y-2.5">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s.toLowerCase()} />
                <span className="font-mono text-[13px] text-ink tabular-nums">{counts[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em] mb-4">Cần xử lý</p>
          {attention.length === 0 ? (
            <p className="text-[13px] text-ink-3">Không có khóa học nào cần xử lý.</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <StatusBadge status={c.status.toLowerCase()} />
                  <span className="flex-1 text-[13px] text-ink truncate">{c.title}</span>
                  <Link to="/instructor/courses" className="text-ink-3 hover:text-accent" aria-label="Mở">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
