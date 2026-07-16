import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, PartyPopper, Receipt } from 'lucide-react';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* Centered result screen with grid backdrop and glowing status icon */
function ResultScreen({ tone, icon: Icon, eyebrow, title, children, actions }) {
  const toneClass = {
    success: 'bg-success/10 text-success shadow-[0_0_50px_rgb(52_211_153/0.25)]',
    danger:  'bg-danger/10 text-danger shadow-[0_0_50px_rgb(244_63_94/0.2)]',
    neutral: 'bg-bg-2 text-ink-3',
  }[tone];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
      {tone === 'success' && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{ backgroundImage: 'radial-gradient(ellipse 50% 50% at 50% 20%, rgb(52 211 153 / .07) 0%, transparent 60%)' }}
        />
      )}
      <div className="relative max-w-lg mx-auto px-6 py-24 text-center">
        <div className={cn('w-20 h-20 rounded-2xl grid place-items-center mx-auto mb-6', toneClass)}>
          <Icon className="w-9 h-9" aria-hidden="true" />
        </div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="display text-[30px] mb-4">{title}</h1>
        <div className="mb-8">{children}</div>
        <div className="flex flex-wrap gap-3 justify-center">{actions}</div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const { role }        = useAuth();
  const { clear }       = useCart();

  const [state, setState] = useState('verifying'); // 'verifying' | 'success' | 'failed' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (role === 'guest') {
      navigate('/login', { replace: true });
      return;
    }

    // Collect all vnp_* params + dev_mock into an object
    const params = {};
    searchParams.forEach((val, key) => { params[key] = val; });

    if (!params.vnp_TxnRef) {
      setState('error');
      setErrorMsg('Không tìm thấy thông tin giao dịch.');
      return;
    }

    api.post('/api/orders/verify', params)
      .then(({ data }) => {
        if (data.success) {
          clear(); // remove paid courses from cart
          setState('success');
          setOrderInfo(data);
        } else {
          setState('failed');
          setOrderInfo(data);
        }
      })
      .catch((err) => {
        setState('error');
        setErrorMsg(apiMessage(err, 'Không thể xác thực thanh toán'));
      });
  }, []); // eslint-disable-line

  const amountStr = searchParams.get('vnp_Amount');
  const amount    = amountStr ? Number(amountStr) / 100 : null;
  const orderCode = orderInfo?.orderCode ?? searchParams.get('vnp_TxnRef');

  if (state === 'verifying') {
    return (
      <>
        <Seo title="Đang xác thực thanh toán — Hoisted" />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none" aria-hidden="true" />
          <div className="relative flex flex-col items-center justify-center py-36 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <p className="font-mono text-ink-3 text-sm" aria-live="polite">Đang xác thực thanh toán với VNPay…</p>
          </div>
        </div>
      </>
    );
  }

  if (state === 'success') {
    return (
      <>
        <Seo title="Thanh toán thành công — Hoisted" />
        <ResultScreen
          tone="success"
          icon={PartyPopper}
          eyebrow="// thanh toán thành công"
          title="Chúc mừng, khóa học đã mở!"
          actions={
            <>
              <Link to="/me"><Button size="lg" className="shadow-[0_8px_24px_rgb(var(--accent)/0.3)]">Đi học ngay →</Button></Link>
              <Link to="/courses"><Button size="lg" variant="ghost">Khám phá thêm</Button></Link>
            </>
          }
        >
          {/* Receipt card */}
          <div className="card p-5 max-w-[320px] mx-auto text-left">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-line border-dashed">
              <Receipt className="w-4 h-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-[11px] text-ink-3 uppercase tracking-[0.08em]">Biên nhận</span>
            </div>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Mã đơn</dt>
                <dd className="font-mono font-semibold text-ink">{orderCode}</dd>
              </div>
              {amount !== null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">Đã thanh toán</dt>
                  <dd className="font-mono font-bold text-[16px] text-success tabular-nums">{formatVND(amount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Trạng thái</dt>
                <dd className="flex items-center gap-1.5 text-success font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Hoàn tất
                </dd>
              </div>
            </dl>
          </div>
        </ResultScreen>
      </>
    );
  }

  if (state === 'failed') {
    return (
      <>
        <Seo title="Thanh toán thất bại — Hoisted" />
        <ResultScreen
          tone="danger"
          icon={XCircle}
          eyebrow="// thanh toán thất bại"
          title="Thanh toán không thành công"
          actions={
            <>
              <Link to="/cart"><Button size="lg">Quay lại giỏ hàng</Button></Link>
              <Link to="/me/orders"><Button size="lg" variant="ghost">Xem đơn hàng</Button></Link>
            </>
          }
        >
          <p className="text-ink-2 leading-relaxed">
            Giao dịch{orderCode ? <> <span className="font-mono text-ink">{orderCode}</span></> : ''} bị từ chối hoặc hết hạn.
            Chưa có khoản tiền nào bị trừ — bạn có thể thử thanh toán lại.
          </p>
        </ResultScreen>
      </>
    );
  }

  return (
    <>
      <Seo title="Lỗi xác thực thanh toán — Hoisted" />
      <ResultScreen
        tone="neutral"
        icon={XCircle}
        eyebrow="// lỗi xác thực"
        title="Có lỗi xảy ra"
        actions={
          <>
            <Link to="/cart"><Button size="lg">Quay lại giỏ hàng</Button></Link>
            <Link to="/me/orders"><Button size="lg" variant="ghost">Xem đơn hàng</Button></Link>
          </>
        }
      >
        <p className="text-ink-2 leading-relaxed">
          {errorMsg} Nếu bạn đã bị trừ tiền, đơn hàng sẽ được cập nhật trong ít phút —
          kiểm tra lại ở mục "Đơn hàng của tôi".
        </p>
      </ResultScreen>
    </>
  );
}
