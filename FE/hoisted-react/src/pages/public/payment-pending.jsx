import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CreditCard, ShoppingBag, AlertTriangle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ── Real-time countdown (1s tick) ──────────────────────────────── */
function useCountdown(expiresAt) {
  const [ms, setMs] = useState(() =>
    expiresAt ? new Date(expiresAt).getTime() - Date.now() : null,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return ms;
}

function splitTime(ms) {
  if (ms == null || ms <= 0) return { h: '00', m: '00', s: '00', expired: true };
  const total = Math.floor(ms / 1000);
  const pad   = (n) => String(n).padStart(2, '0');
  return {
    h: pad(Math.floor(total / 3600)),
    m: pad(Math.floor((total % 3600) / 60)),
    s: pad(total % 60),
    expired: false,
  };
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function PaymentPendingPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const qc          = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get(`/api/orders/${orderId}`).then((r) => r.data.order),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const payMutation = useMutation({
    mutationFn: () => api.post(`/api/orders/${orderId}/pay`).then((r) => r.data),
    onSuccess: ({ paymentUrl }) => {
      if (paymentUrl.startsWith('http')) window.location.href = paymentUrl;
      else navigate(paymentUrl);
    },
    onError: (err) => {
      toast.error(apiMessage(err, 'Không thể tiếp tục thanh toán'));
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });

  const remainingMs = useCountdown(data?.expires_at ?? null);
  const time        = splitTime(remainingMs);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 animate-pulse space-y-4">
        <div className="h-4 bg-bg-3 rounded w-1/4" />
        <div className="h-8 bg-bg-3 rounded w-1/2" />
        <div className="h-48 bg-bg-3 rounded-xl" />
        <div className="h-12 bg-bg-3 rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="font-mono text-ink-3 mb-3">// 404</p>
        <p className="text-ink-2 mb-5">Không tìm thấy đơn hàng.</p>
        <Link to="/me/orders"><Button variant="ghost">← Đơn hàng của tôi</Button></Link>
      </div>
    );
  }

  const isPaid      = data.status === 'PAID';
  const isCancelled = data.status === 'CANCELLED' || data.status === 'FAILED';
  const isExpired   = data.status === 'PENDING' && time.expired;

  /* ── Paid state ── */
  if (isPaid) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 grid place-items-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <p className="eyebrow mb-2">// đã thanh toán</p>
        <h1 className="display text-[26px] mb-3">Thanh toán thành công!</h1>
        <p className="text-ink-2 text-[14px] mb-7">
          Đơn hàng <span className="font-mono font-semibold text-ink">{data.order_code}</span> đã được xác nhận.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/me"><Button>Bắt đầu học ngay →</Button></Link>
          <Link to="/me/orders"><Button variant="ghost">Xem đơn hàng</Button></Link>
        </div>
      </div>
    );
  }

  /* ── Cancelled / expired state ── */
  if (isCancelled || isExpired) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 grid place-items-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <p className="eyebrow mb-2">// đơn hàng hết hạn</p>
        <h1 className="display text-[26px] mb-3">Đơn hàng đã hết hạn</h1>
        <p className="text-ink-2 text-[14px] mb-7">
          Đơn hàng <span className="font-mono font-semibold text-ink">{data.order_code}</span> đã quá 24h
          và được hủy tự động. Bạn có thể thêm khóa học vào giỏ và đặt lại.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/courses"><Button>Mua lại</Button></Link>
          <Link to="/me/orders"><Button variant="ghost">← Đơn hàng của tôi</Button></Link>
        </div>
      </div>
    );
  }

  /* ── Pending state (main) ── */
  const expiryLabel = data.expires_at
    ? new Date(data.expires_at).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const urgency = remainingMs != null && remainingMs < 3_600_000; // < 1h

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      {/* Back */}
      <Link
        to="/me/orders"
        className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-3 hover:text-ink mb-6 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Đơn hàng của tôi
      </Link>

      <p className="eyebrow mb-2">// thanh toán</p>
      <h1 className="display text-[28px] mb-1">Hoàn tất thanh toán</h1>
      <div className="flex items-center gap-2 mb-8">
        <span className="font-mono text-[13px] text-ink-2">{data.order_code}</span>
        <StatusBadge status={data.status} />
      </div>

      {/* ── Countdown card ── */}
      <div className={cn(
        'card p-6 mb-6 text-center border-2 transition-colors',
        urgency ? 'border-danger/40 bg-danger/5' : 'border-accent/30',
      )}>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Clock className={cn('w-4 h-4', urgency ? 'text-danger' : 'text-accent')} />
          <p className={cn('font-mono text-[12px] font-semibold uppercase tracking-wide',
            urgency ? 'text-danger' : 'text-accent',
          )}>
            Thời gian còn lại để thanh toán
          </p>
        </div>

        {/* HH : MM : SS */}
        <div className="flex items-end justify-center gap-2 mb-3">
          {[
            { val: time.h,  label: 'giờ'  },
            { val: time.m,  label: 'phút' },
            { val: time.s,  label: 'giây' },
          ].map(({ val, label }, i) => (
            <div key={label} className="flex items-end gap-2">
              {i > 0 && (
                <span className={cn(
                  'text-[32px] font-mono font-bold pb-5 leading-none',
                  urgency ? 'text-danger' : 'text-ink',
                )}>:</span>
              )}
              <div className="flex flex-col items-center">
                <span className={cn(
                  'font-mono font-bold text-[52px] leading-none tabular-nums',
                  urgency ? 'text-danger' : 'text-ink',
                )}>{val}</span>
                <span className="font-mono text-[11px] text-ink-3 mt-1 uppercase tracking-wide">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {expiryLabel && (
          <p className="font-mono text-[12px] text-ink-3">
            Hết hạn vào <span className="text-ink-2 font-semibold">{expiryLabel}</span>
          </p>
        )}
      </div>

      {/* ── Order items ── */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-4 h-4 text-ink-3" />
          <h2 className="font-semibold text-[14px]">Nội dung đơn hàng</h2>
        </div>
        <div className="space-y-2.5">
          {(data.items ?? []).map((item) => (
            <div key={item.course_id} className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="text-ink-2 flex-1 leading-snug">{item.course_title}</span>
              <span className="font-mono font-semibold text-ink shrink-0">{formatVND(item.price)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-line mt-4 pt-3 flex justify-between items-center">
          <span className="font-semibold text-[14px]">Tổng cộng</span>
          <span className="font-mono font-bold text-[22px] text-ink">{formatVND(data.total_amount)}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <Button
        size="lg"
        className="w-full justify-center mb-3"
        disabled={payMutation.isPending}
        onClick={() => payMutation.mutate()}>
        <CreditCard className="w-4 h-4" />
        {payMutation.isPending ? 'Đang chuyển đến VNPay…' : 'Thanh toán qua VNPay'}
      </Button>

      <p className="font-mono text-[11px] text-ink-3 text-center">
        Bảo mật SSL • Sau 24h đơn hàng sẽ tự động hủy
      </p>
    </div>
  );
}
