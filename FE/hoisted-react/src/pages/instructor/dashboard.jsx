import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, Star, Layers, ArrowRight, Wallet, Hourglass, BadgeCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { useAuth } from '@/store/auth';

const STATUS_ORDER = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'];

const fmtNum = (n) => Number(n ?? 0).toLocaleString('vi-VN');

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
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
  const earn = data?.earnings;
  const hasReviews = data?.reviewCount > 0;

  const stats = [
    { label: 'Khóa học',  value: fmtNum(total),         icon: BookOpen },
    { label: 'Học viên',  value: fmtNum(data?.students), icon: Users },
    { label: 'Bài học',   value: fmtNum(data?.lessons),  icon: Layers },
    // Điểm TB chỉ có nghĩa kèm số lượt — "5" trơn dễ đọc thành điểm tuyệt đối
    {
      label: 'Đánh giá',
      value: hasReviews ? `${data.avgRating.toLocaleString('vi-VN', { minimumFractionDigits: 1 })}/5` : '—',
      hint: hasReviews ? `từ ${fmtNum(data.reviewCount)} lượt` : 'Chưa có đánh giá',
      icon: Star,
    },
  ];

  const money = earn ? [
    { label: 'Thu nhập của bạn', value: earn.earned, icon: Wallet, hint: `${fmtNum(earn.sales)} lượt mua đã thanh toán` },
    { label: 'Số dư chờ chi trả', value: earn.balance + earn.pending, icon: Hourglass,
      hint: earn.pending ? `${formatVND(earn.pending)} đang được xử lý` : 'chuyển khoản khi quản trị viên đối soát' },
    { label: 'Đã nhận', value: earn.paidOut, icon: BadgeCheck },
  ] : [];

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ tổng-quan</span></p>
          <h1 className="display text-[32px]">Xin chào, {user?.name ?? 'giảng viên'}</h1>
        </div>
        <Link to="/instructor/courses">
          <Button size="sm">Quản lý khóa học <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Button>
        </Link>
      </div>

      {isError && (
        <div className="card p-5 mb-6 flex flex-wrap items-center gap-3" role="alert">
          <p className="flex-1 text-[13px] text-ink-2">Không tải được số liệu tổng quan. Kiểm tra kết nối rồi thử lại.</p>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>Thử lại</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">{label}</p>
            </div>
            <p className="font-pixel font-extrabold text-[35px] text-ink leading-none tabular-nums">
              {isLoading ? '…' : value}
            </p>
            {hint && !isLoading && <p className="mt-1.5 font-mono text-[10.5px] text-ink-3">{hint}</p>}
          </div>
        ))}
      </div>

      {/* Thu nhập — cùng nguồn services/revenue với trang Doanh thu nên luôn khớp */}
      <section className="card p-5 mb-6" aria-labelledby="earnings-heading">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p id="earnings-heading" className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Thu nhập</p>
          <Link to="/instructor/revenue" className="flex items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-accent transition-colors">
            Xem doanh thu <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        {isLoading ? (
          <p className="font-mono text-[12px] text-ink-3">Đang tải số liệu thu nhập…</p>
        ) : !earn ? (
          <p className="text-[13px] text-ink-3">Chưa có số liệu thu nhập.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 sm:divide-x sm:divide-line">
            {money.map(({ label, value, hint, icon: Icon }) => (
              <div key={label} className="sm:px-5 first:sm:pl-0 last:sm:pr-0">
                <dt className="flex items-center gap-2 mb-1.5 text-[12.5px] text-ink-2">
                  <Icon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" /> {label}
                </dt>
                <dd className="font-pixel font-extrabold text-[29px] text-ink leading-none tabular-nums">{formatVND(value)}</dd>
                {hint && <dd className="mt-1.5 font-mono text-[10.5px] text-ink-3">{hint}</dd>}
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em] mb-4">Trạng thái khóa học</p>
          <div className="space-y-2.5">
            {/* Lưu trữ chỉ hiện khi có — để các dòng cộng lại đúng bằng "Khóa học" ở trên */}
            {STATUS_ORDER.filter((s) => s !== 'ARCHIVED' || counts[s]).map((s) => (
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
            <p className="text-[13px] text-ink-3">Không có khóa học nháp hay bị từ chối nào cần xử lý.</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((c) => (
                <li key={c.id}>
                  <Link to="/instructor/courses" className="flex items-center gap-3 group rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-bg-2 transition-colors">
                    <StatusBadge status={c.status.toLowerCase()} />
                    <span className="flex-1 text-[13px] text-ink truncate">{c.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-3 group-hover:text-accent" aria-hidden="true" />
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
