import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CreditCard, ShoppingBag, AlertTriangle, ChevronLeft, CheckCircle2, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Seo } from '@/components/seo.jsx';
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

/* ── Checkout stepper: Giỏ hàng → Thanh toán → Hoàn tất ─────────── */
function Stepper({ current }) {
  const steps = ['Giỏ hàng', 'Thanh toán', 'Hoàn tất'];
  return (
    <ol className="flex items-center gap-2 mb-8" aria-label="Tiến trình thanh toán">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={cn('w-8 h-px', done || active ? 'bg-accent' : 'bg-line')} aria-hidden="true" />}
            <span className={cn(
              'flex items-center gap-2 font-mono text-[12px]',
              active ? 'text-accent font-semibold' : done ? 'text-ink-2' : 'text-ink-3',
            )}>
              <span className={cn(
                'w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold',
                done ? 'bg-accent/15 text-accent' : active ? 'bg-accent text-accent-ink' : 'border border-line',
              )} aria-hidden="true">
                {done ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* Centered status screen shared by paid / expired states */
function StatusScreen({ tone, icon: Icon, eyebrow, title, children, actions }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-xl mx-auto px-6 py-24 text-center">
        <div className={cn(
          'w-20 h-20 rounded-2xl grid place-items-center mx-auto mb-6',
          tone === 'success' ? 'bg-success/10 text-success shadow-[0_0_40px_rgb(52_211_153/0.25)]'
                             : 'bg-danger/10 text-danger shadow-[0_0_40px_rgb(244_63_94/0.2)]',
        )}>
          <Icon className="w-9 h-9" aria-hidden="true" />
        </div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="display text-[28px] mb-3">{title}</h1>
        <div className="text-ink-2 text-[14px] leading-relaxed mb-8">{children}</div>
        <div className="flex flex-wrap gap-3 justify-center">{actions}</div>
      </div>
    </div>
  );
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
      <div className="max-w-xl mx-auto px-6 py-20 animate-pulse motion-reduce:animate-none space-y-4" aria-hidden="true">
        <div className="h-4 bg-bg-3 rounded w-1/4" />
        <div className="h-8 bg-bg-3 rounded w-1/2" />
        <div className="h-48 bg-bg-3 rounded-2xl" />
        <div className="h-12 bg-bg-3 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StatusScreen
        tone="danger"
        icon={AlertTriangle}
        eyebrow="// không tìm thấy"
        title="Không tìm thấy đơn hàng"
        actions={<Link to="/me/orders"><Button variant="ghost">← Đơn hàng của tôi</Button></Link>}
      >
        Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.
      </StatusScreen>
    );
  }

  const isPaid      = data.status === 'PAID';
  const isCancelled = data.status === 'CANCELLED' || data.status === 'FAILED';
  const isExpired   = data.status === 'PENDING' && time.expired;

  /* ── Paid state ── */
  if (isPaid) {
    return (
      <>
        <Seo title="Thanh toán thành công — Hoisted" />
        <StatusScreen
          tone="success"
          icon={CheckCircle2}
          eyebrow="// đã thanh toán"
          title="Thanh toán thành công!"
          actions={
            <>
              <Link to="/me"><Button size="lg">Bắt đầu học ngay →</Button></Link>
              <Link to="/me/orders"><Button size="lg" variant="ghost">Xem đơn hàng</Button></Link>
            </>
          }
        >
          Đơn hàng <span className="font-mono font-semibold text-ink">{data.order_code}</span> đã được xác nhận.
          Khóa học đã mở trong mục "Học tập của tôi".
        </StatusScreen>
      </>
    );
  }

  /* ── Cancelled / expired state ── */
  if (isCancelled || isExpired) {
    return (
      <>
        <Seo title="Đơn hàng hết hạn — Hoisted" />
        <StatusScreen
          tone="danger"
          icon={AlertTriangle}
          eyebrow="// đơn hàng hết hạn"
          title="Đơn hàng đã hết hạn"
          actions={
            <>
              <Link to="/courses"><Button size="lg">Mua lại</Button></Link>
              <Link to="/me/orders"><Button size="lg" variant="ghost">← Đơn hàng của tôi</Button></Link>
            </>
          }
        >
          Đơn hàng <span className="font-mono font-semibold text-ink">{data.order_code}</span> đã quá 24h
          và được hủy tự động. Bạn có thể thêm khóa học vào giỏ và đặt lại.
        </StatusScreen>
      </>
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
    <div className="relative overflow-hidden">
      <Seo title={`Thanh toán đơn ${data.order_code} — Hoisted`} />
      <div className="absolute inset-x-0 top-0 h-[320px] pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-grid mask-fade-y" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgb(var(--accent) / .08) 0%, transparent 60%)' }}
        />
      </div>

      <div className="relative max-w-xl mx-auto px-5 sm:px-6 py-10">
        {/* Back */}
        <Link
          to="/me/orders"
          className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-3 hover:text-ink mb-6 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Đơn hàng của tôi
        </Link>

        <Stepper current={1} />

        <h1 className="display text-[28px] sm:text-[32px] mb-2">Hoàn tất thanh toán</h1>
        <div className="flex items-center gap-2.5 mb-8">
          <span className="font-mono text-[13px] text-ink-2">{data.order_code}</span>
          <StatusBadge status={data.status} />
        </div>

        {/* ── Countdown board ── */}
        <div className={cn(
          'card p-6 sm:p-7 mb-5 text-center border-2 transition-colors relative overflow-hidden',
          urgency ? 'border-danger/40' : 'border-accent/30',
        )}>
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background: urgency
                ? 'radial-gradient(ellipse at 50% 0%, rgb(244 63 94 / .07) 0%, transparent 60%)'
                : 'radial-gradient(ellipse at 50% 0%, rgb(var(--accent) / .07) 0%, transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-center gap-1.5 mb-5">
              <Clock className={cn('w-4 h-4', urgency ? 'text-danger' : 'text-accent')} aria-hidden="true" />
              <p className={cn(
                'font-mono text-[11.5px] font-semibold uppercase tracking-[0.08em]',
                urgency ? 'text-danger' : 'text-accent',
              )}>
                Thời gian còn lại để thanh toán
              </p>
            </div>

            {/* HH : MM : SS flight-board cells */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4" role="timer" aria-label={`Còn ${time.h} giờ ${time.m} phút ${time.s} giây`}>
              {[
                { val: time.h, label: 'giờ'  },
                { val: time.m, label: 'phút' },
                { val: time.s, label: 'giây' },
              ].map(({ val, label }, i) => (
                <div key={label} className="flex items-center gap-2 sm:gap-3">
                  {i > 0 && (
                    <span className={cn(
                      'text-[28px] font-mono font-bold leading-none pb-6',
                      urgency ? 'text-danger/60' : 'text-ink-3',
                    )} aria-hidden="true">:</span>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      'soft w-[72px] sm:w-[84px] py-3.5 rounded-xl border',
                      urgency ? 'border-danger/25' : 'border-line',
                    )}>
                      <span className={cn(
                        'font-mono font-bold text-[38px] sm:text-[44px] leading-none tabular-nums',
                        urgency ? 'text-danger' : 'text-ink',
                      )}>{val}</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-ink-3 uppercase tracking-[0.1em]">{label}</span>
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
        </div>

        {/* ── Order items ── */}
        <div className="card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-accent" aria-hidden="true" />
            <h2 className="font-display font-semibold text-[14px]">Nội dung đơn hàng</h2>
          </div>
          <div className="space-y-2.5">
            {(data.items ?? []).map((item) => (
              <div key={item.course_id} className="flex items-center justify-between gap-3 text-[13.5px]">
                <span className="text-ink-2 flex-1 leading-snug">{item.course_title}</span>
                <span className="font-mono font-semibold text-ink shrink-0 tabular-nums">{formatVND(item.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line mt-4 pt-4 flex justify-between items-end">
            <span className="font-semibold text-[14px]">Tổng cộng</span>
            <span className="font-mono font-bold text-[24px] text-ink leading-none tabular-nums">
              {formatVND(data.total_amount)}
            </span>
          </div>
        </div>

        {/* ── Actions ── */}
        <Button
          size="lg"
          className="w-full justify-center mb-4 shadow-[0_8px_24px_rgb(var(--accent)/0.3)]"
          disabled={payMutation.isPending}
          onClick={() => payMutation.mutate()}
        >
          <CreditCard className="w-4 h-4" aria-hidden="true" />
          {payMutation.isPending ? 'Đang chuyển đến VNPay…' : 'Thanh toán qua VNPay'}
        </Button>

        <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-ink-3 text-center">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Bảo mật SSL · Sau 24h đơn hàng sẽ tự động hủy
        </p>
      </div>
    </div>
  );
}
