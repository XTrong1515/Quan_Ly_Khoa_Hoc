import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useCart } from '@/store/cart';
import { useAuth } from '@/store/auth';
import { api, apiMessage } from '@/lib/api';
import { formatVND } from '@/lib/format';

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
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader className="w-10 h-10 text-accent animate-spin" />
        <p className="font-mono text-ink-3 text-sm">Đang xác thực thanh toán…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-success/10 grid place-items-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <p className="eyebrow mb-2">// thanh toán thành công</p>
        <h1 className="display text-[32px] mb-3">Chúc mừng! 🎉</h1>
        <p className="text-ink-2 mb-2">
          Đơn hàng <span className="font-mono text-ink">{orderCode}</span> đã được thanh toán.
        </p>
        {amount !== null && (
          <p className="font-mono font-bold text-[22px] text-ink mb-6">{formatVND(amount)}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/me"><Button>Đi học ngay →</Button></Link>
          <Link to="/courses"><Button variant="ghost">Khám phá thêm</Button></Link>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-danger/10 grid place-items-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-danger" />
        </div>
        <p className="eyebrow mb-2">// thanh toán thất bại</p>
        <h1 className="display text-[32px] mb-3">Thanh toán không thành công</h1>
        <p className="text-ink-2 mb-6">
          Giao dịch bị từ chối hoặc hết hạn. Vui lòng thử lại.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/cart"><Button>Quay lại giỏ hàng</Button></Link>
          <Link to="/me/orders"><Button variant="ghost">Xem đơn hàng</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-bg-2 grid place-items-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-ink-3" />
      </div>
      <p className="eyebrow mb-2">// lỗi</p>
      <h1 className="display text-[28px] mb-3">Có lỗi xảy ra</h1>
      <p className="text-ink-2 mb-6">{errorMsg}</p>
      <Link to="/cart"><Button>Quay lại giỏ hàng</Button></Link>
    </div>
  );
}
