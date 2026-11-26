import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, PartyPopper, Receipt } from 'lucide-react';
import { Seo } from '@/components/seo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* Centered result screen with grid backdrop and glowing status icon */
function ResultScreen({ tone, icon: Icon, title, children, actions }) {
  const toneClass = {
    success: 'bg-success text-white border-2 border-edge shadow-md',
    danger:  'bg-danger text-white border-2 border-edge shadow-md',
    neutral: 'bg-bg-2 text-ink-2 border-2 border-edge',
  }[tone];

  return (
    <div className="relative overflow-hidden">
      <div className="relative max-w-lg mx-auto px-6 py-24 text-center">
        <div className={cn('w-20 h-20 rounded-sm grid place-items-center mx-auto mb-6', toneClass)}>
          <Icon className="w-9 h-9" aria-hidden="true" />
        </div>
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

  const [state, setState] = useState('verifying'); // 'verifying' | 'success' | 'failed' | 'processing' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const verifiedRef = useRef(false);
  const retryTimer  = useRef(null);

  // Đơn chỉ có 1 khóa → "Vào học" mở thẳng bài cần học tiếp của khóa đó (nhiều khóa → trang Học tập)
  const { data: startHref } = useQuery({
    queryKey: ['payment-start', orderInfo?.orderId],
    enabled: state === 'success' && !!orderInfo?.orderId,
    queryFn: async () => {
      const { data: o } = await api.get(`/api/orders/${orderInfo.orderId}`);
      const items = o.order?.items ?? [];
      if (items.length !== 1) return '/me';
      const { data: en } = await api.get('/api/enrollments/me');
      const list = en.enrollments ?? en.items ?? (Array.isArray(en) ? en : []);
      const e = list.find((x) => Number(x.courseId) === Number(items[0].course_id));
      return e?.nextLessonId ? `/learn/${e.courseId}/${e.nextLessonId}` : '/me';
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (role === 'guest') {
      navigate('/login', { replace: true });
      return;
    }

    verify(0);
    return () => clearTimeout(retryTimer.current);
  }, []); // eslint-disable-line

  // ZaloPay quay về với ?apptransid=…; VNPay / thanh toán giả lập với ?vnp_TxnRef=…
  // Server tự hỏi lại cổng thanh toán, query string chỉ để biết giao dịch nào.
  function verify(attempt) {
    const params = {};
    searchParams.forEach((val, key) => { params[key] = val; });

    if (!params.apptransid && !params.vnp_TxnRef) {
      setState('error');
      setErrorMsg('Đường dẫn này không chứa thông tin giao dịch từ cổng thanh toán.');
      return;
    }

    setState('verifying');
    api.post('/api/orders/verify', params)
      .then(({ data }) => {
        setOrderInfo(data);
        if (data.success) {
          clear(); // remove paid courses from cart
          setState('success');
        } else if (data.status === 'PROCESSING') {
          // ZaloPay có thể cần vài giây để chốt giao dịch → tự hỏi lại vài lần trước khi nhờ học viên bấm
          if (attempt < 4) retryTimer.current = setTimeout(() => verify(attempt + 1), 3000);
          else setState('processing');
        } else {
          setState('failed');
        }
      })
      .catch((err) => {
        setState('error');
        setErrorMsg(apiMessage(err, 'Máy chủ chưa xác nhận được kết quả từ ZaloPay.'));
      });
  }

  const vnpAmount = searchParams.get('vnp_Amount');
  const amount    = orderInfo?.amount ?? (vnpAmount ? Number(vnpAmount) / 100 : null);
  const orderCode = orderInfo?.orderCode ?? searchParams.get('vnp_TxnRef');

  if (state === 'verifying') {
    return (
      <>
        <Seo title="Đang xác thực thanh toán — Hoisted" />
        <div className="relative overflow-hidden">
          <div className="relative flex flex-col items-center justify-center py-36 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 grid place-items-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <p className="font-mono text-ink-3 text-sm" aria-live="polite">Đang xác thực thanh toán với ZaloPay…</p>
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
          title="Chúc mừng, khóa học đã mở!"
          actions={
            <>
              <Link to={startHref ?? '/me'}><Button size="lg" className="shadow">Vào học →</Button></Link>
              <Link to="/courses"><Button size="lg" variant="ghost">Xem thêm khóa học</Button></Link>
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
          title="Thanh toán không thành công"
          actions={
            <>
              <Link to="/cart"><Button size="lg">Về giỏ hàng để thử lại</Button></Link>
              <Link to="/me/orders"><Button size="lg" variant="ghost">Đơn hàng của tôi</Button></Link>
            </>
          }
        >
          <p className="text-ink-2 leading-relaxed">
            Cổng thanh toán báo giao dịch cho đơn{orderCode ? <> <span className="font-mono text-ink">{orderCode}</span></> : ''} bị
            hủy hoặc bị từ chối, nên khóa học chưa được mở. Khóa học vẫn nằm trong giỏ của bạn để thanh toán lại.
          </p>
        </ResultScreen>
      </>
    );
  }

  if (state === 'processing') {
    return (
      <>
        <Seo title="Giao dịch đang xử lý — Hoisted" />
        <ResultScreen
          tone="neutral"
          icon={Loader2}
          title="ZaloPay đang xử lý giao dịch"
          actions={
            <>
              <Button size="lg" onClick={() => verify(0)}>Kiểm tra lại</Button>
              <Link to="/me/orders"><Button size="lg" variant="ghost">Đơn hàng của tôi</Button></Link>
            </>
          }
        >
          <p className="text-ink-2 leading-relaxed">
            Đơn{orderCode ? <> <span className="font-mono text-ink">{orderCode}</span></> : ''} chưa được ZaloPay chốt kết quả.
            Nếu bạn đã xác nhận trên ứng dụng ZaloPay, đợi ít phút rồi bấm "Kiểm tra lại". Chưa trả tiền thì
            có thể thanh toán lại từ "Đơn hàng của tôi".
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
        title="Chưa xác nhận được thanh toán"
        actions={
          <>
            <Button size="lg" onClick={() => verify(0)}>Xác nhận lại</Button>
            <Link to="/me/orders"><Button size="lg" variant="ghost">Đơn hàng của tôi</Button></Link>
          </>
        }
      >
        <p className="text-ink-2 leading-relaxed">
          {errorMsg} Nếu tài khoản đã bị trừ tiền, bấm "Xác nhận lại" để kiểm tra lần nữa,
          hoặc xem trạng thái ở "Đơn hàng của tôi" và giữ lại mã đơn{orderCode ? <> <span className="font-mono text-ink">{orderCode}</span></> : ''} để đối soát.
        </p>
      </ResultScreen>
    </>
  );
}
