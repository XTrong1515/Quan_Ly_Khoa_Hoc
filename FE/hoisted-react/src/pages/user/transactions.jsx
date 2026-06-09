import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/format';

function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.get('/api/transactions/me').then((r) => r.data.transactions),
    staleTime: 30_000,
  });
}

export default function TransactionsPage() {
  const { data: transactions = [], isLoading } = useTransactions();

  const total = transactions.reduce((sum, t) => (t.status === 'PAID' ? sum + Number(t.amount) : sum), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="eyebrow mb-2">// lịch sử giao dịch</p>
      <h1 className="display text-[28px] mb-2">Giao dịch</h1>

      {!isLoading && transactions.length > 0 && (
        <div className="mb-6 p-4 bg-bg-2 rounded-xl border border-line flex items-center gap-4">
          <div>
            <p className="font-mono text-[11.5px] text-ink-3 uppercase tracking-wide">Tổng đã thanh toán</p>
            <p className="font-mono font-bold text-[24px] text-ink">{formatVND(total)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[11.5px] text-ink-3">Số giao dịch</p>
            <p className="font-mono font-bold text-[20px] text-ink">{transactions.length}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16 bg-bg-2" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-20 text-center">
          <Receipt className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="font-mono text-ink-3 mb-2">// chưa có giao dịch nào</p>
          <Link to="/courses"><Button variant="ghost">Mua khóa học ngay</Button></Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-line bg-bg-2 font-mono text-[11px] text-ink-3 uppercase tracking-wide">
            <span>Mã đơn</span>
            <span>Ngày</span>
            <span>Phương thức</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
          </div>
          {transactions.map((t) => (
            <div key={t.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-line last:border-0 hover:bg-bg-2 transition items-center">
              <div>
                <p className="font-mono font-semibold text-[13px] text-ink">{t.order_code}</p>
                {t.transaction_id && (
                  <p className="font-mono text-[11px] text-ink-3">TxnID: {t.transaction_id}</p>
                )}
              </div>
              <span className="font-mono text-[12.5px] text-ink-2">
                {new Date(t.paid_at ?? t.created_at).toLocaleDateString('vi-VN')}
              </span>
              <span className="font-mono text-[12.5px] text-ink-2">{t.payment_method ?? 'VNPay'}</span>
              <span className="font-mono font-bold text-[14px] text-ink">{formatVND(t.amount)}</span>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
