import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, BookOpen, Clock, CreditCard } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="eyebrow mb-2">// lịch sử đơn hàng</p>
      <h1 className="display text-[28px] mb-6">Đơn hàng của tôi</h1>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            className={cn(
              'h-8 px-3.5 rounded-full font-mono text-[12.5px] border transition',
              status === s.value
                ? 'bg-accent text-accent-ink border-accent font-semibold'
                : 'border-line text-ink-2 hover:bg-bg-2',
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-20 bg-bg-2" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center">
          <BookOpen className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="font-mono text-ink-3 mb-2">// chưa có đơn hàng nào</p>
          <Link to="/courses"><Button variant="ghost">Khám phá khóa học</Button></Link>
        </div>
      ) : (
        <>
          <p className="font-mono text-[12px] text-ink-3 mb-3">{total} đơn hàng</p>
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onPay={() => handlePay(order.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button key={pg} onClick={() => setPage(pg)}
                  className={cn(
                    'w-8 h-8 rounded-lg border text-[13px] font-mono transition',
                    pg === page
                      ? 'border-accent bg-accent text-accent-ink font-bold'
                      : 'border-line text-ink-2 hover:bg-bg-2',
                  )}>
                  {pg}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-2 hover:bg-bg-2 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
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
    <div className="card overflow-hidden">
      <div
        role="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-2 transition text-left cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono font-semibold text-[13.5px] text-ink">{order.order_code}</span>
            <StatusBadge status={isExpired ? 'cancelled' : order.status} />
          </div>
          <div className="flex gap-4 text-[12px] text-ink-3 font-mono">
            <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
            <span>{order.items?.length ?? 0} khóa học</span>
            {isPending && !isExpired && remainingMs < Infinity && (
              <span className="flex items-center gap-1 text-warning">
                <Clock className="w-3 h-3" /> Còn {formatCountdown(remainingMs)} để thanh toán
              </span>
            )}
          </div>
        </div>
        <span className="font-mono font-bold text-[17px] text-ink shrink-0">{formatVND(order.total_amount)}</span>
        {isPending && !isExpired && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPay(); }}
            className="shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
            Thanh toán ngay
          </Button>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-ink-3 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-ink-3 shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-line px-4 py-3 bg-bg-2 space-y-2">
          {order.items?.map((item) => (
            <div key={item.course_id} className="flex justify-between text-[13px]">
              <span className="text-ink-2">{item.course_title}</span>
              <span className="font-mono text-ink">{formatVND(item.price)}</span>
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
