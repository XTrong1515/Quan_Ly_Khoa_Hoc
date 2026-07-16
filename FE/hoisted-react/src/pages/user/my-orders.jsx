import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown, BookOpen, Clock, CreditCard } from 'lucide-react';
import { AccountShell } from '@/components/layout/account-shell.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUSES = [
  { value: '',           label: 'Tất cả'   },
  { value: 'PENDING',    label: 'Chờ TT'   },
  { value: 'PAID',       label: 'Đã TT'    },
  { value: 'FAILED',     label: 'Thất bại' },
  { value: 'CANCELLED',  label: 'Đã hủy'   },
];

function useOrders(status, page) {
  return useQuery({
    queryKey: ['my-orders', status, page],
    queryFn: () =>
      api.get('/api/orders/me', { params: { status, page, limit: 10 } }).then((r) => r.data),
    staleTime: 30_000,
  });
}

export default function MyOrdersPage() {
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  const { data, isLoading } = useOrders(status, page);
  const orders     = data?.orders     ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total      = data?.total      ?? 0;

  const handleStatusChange = (s) => { setStatus(s); setPage(1); setExpanded(null); };
  const handlePay = (id) => navigate(`/payment/pending/${id}`);

  return (
    <AccountShell title="Đơn hàng của tôi" desc="Lịch sử mua khóa học và trạng thái thanh toán">
      <Seo title="Đơn hàng của tôi — Hoisted" />

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Lọc theo trạng thái">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            aria-pressed={status === s.value}
            className={cn(
              'h-8 px-3.5 rounded-full font-mono text-[12.5px] border transition-colors cursor-pointer',
              status === s.value
                ? 'bg-accent text-accent-ink border-accent font-semibold'
                : 'border-line text-ink-2 hover:border-accent/40 hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse motion-reduce:animate-none h-20" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card relative overflow-hidden py-20 px-6 text-center">
          <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-60" aria-hidden="true" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-5">
              <BookOpen className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="font-display font-bold text-[17px] mb-1.5">Chưa có đơn hàng nào</h3>
            <p className="text-ink-2 text-[13.5px] mb-6">Đơn hàng sẽ xuất hiện ở đây sau khi bạn mua khóa học.</p>
            <Link to="/courses"><Button variant="ghost">Khám phá khóa học</Button></Link>
          </div>
        </div>
      ) : (
        <>
          <p className="font-mono text-[12px] text-ink-3 mb-4">
            <b className="text-ink">{total}</b> đơn hàng
          </p>
          <div className="space-y-3">
            {orders.map((order, i) => (
              <Reveal key={order.id} delay={i * 40}>
                <OrderRow
                  order={order}
                  expanded={expanded === order.id}
                  onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                  onPay={() => handlePay(order.id)}
                />
              </Reveal>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Phân trang">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Trang trước"
                className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 hover:border-accent/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  aria-current={pg === page ? 'page' : undefined}
                  className={cn(
                    'w-9 h-9 rounded-xl border text-[13px] font-mono transition-colors cursor-pointer',
                    pg === page
                      ? 'border-accent bg-accent text-accent-ink font-bold'
                      : 'border-line text-ink-2 hover:bg-bg-2 hover:border-accent/40',
                  )}
                >
                  {pg}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Trang sau"
                className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 hover:border-accent/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </AccountShell>
  );
}

function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return Infinity;
  return new Date(expiresAt).getTime() - now;
}

function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function OrderRow({ order, expanded, onToggle, onPay }) {
  const isPending = order.status === 'PENDING';
  const remainingMs = useCountdown(isPending ? order.expires_at : null);
  const isExpired = isPending && remainingMs <= 0;

  return (
    <div className={cn('card overflow-hidden transition-colors', expanded && 'border-accent/25')}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-bg-2 transition-colors text-left cursor-pointer"
      >
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono font-semibold text-[13.5px] text-ink">{order.order_code}</span>
            <StatusBadge status={isExpired ? 'cancelled' : order.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3 font-mono">
            <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
            <span>{order.items?.length ?? 0} khóa học</span>
            {isPending && !isExpired && remainingMs < Infinity && (
              <span className="flex items-center gap-1 text-warning">
                <Clock className="w-3 h-3" aria-hidden="true" /> Còn {formatCountdown(remainingMs)} để thanh toán
              </span>
            )}
          </div>
        </div>
        <span className="font-mono font-bold text-[17px] text-ink shrink-0 tabular-nums">
          {formatVND(order.total_amount)}
        </span>
        {isPending && !isExpired && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPay(); }}
            className="shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
            Thanh toán ngay
          </Button>
        )}
        <ChevronDown
          className={cn('w-4 h-4 text-ink-3 shrink-0 transition-transform duration-200', expanded && 'rotate-180')}
          aria-hidden="true"
        />
      </div>

      {expanded && (
        <div className="border-t border-line px-5 py-4 bg-bg-2 space-y-2">
          {order.items?.map((item) => (
            <div key={item.course_id} className="flex justify-between gap-4 text-[13px]">
              <span className="text-ink-2">{item.course_title}</span>
              <span className="font-mono text-ink shrink-0">{formatVND(item.price)}</span>
            </div>
          ))}
          {order.paid_at && (
            <p className="font-mono text-[11.5px] text-ink-3 pt-2 border-t border-line">
              Thanh toán lúc: {new Date(order.paid_at).toLocaleString('vi-VN')}
              {order.transaction_id && ` · TxnID: ${order.transaction_id}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
