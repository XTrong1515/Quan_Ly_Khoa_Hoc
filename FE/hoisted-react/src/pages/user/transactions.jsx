import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Wallet, Hash } from 'lucide-react';
import { AccountShell } from '@/components/layout/account-shell.jsx';
import { Reveal } from '@/components/reveal.jsx';
import { Seo } from '@/components/seo.jsx';
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
    <AccountShell title="Giao dịch" desc="Lịch sử thanh toán qua VNPay">
      <Seo title="Lịch sử giao dịch — Hoisted" />

      {!isLoading && transactions.length > 0 && (
        <Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7 max-w-xl">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent grid place-items-center flex-shrink-0">
                <Wallet className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[11px] text-ink-3 uppercase tracking-wide mb-1">Tổng đã thanh toán</p>
                <p className="font-mono font-bold text-[22px] text-ink leading-none tabular-nums">{formatVND(total)}</p>
              </div>
            </div>
            <div className="card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo/10 text-indigo grid place-items-center flex-shrink-0">
                <Hash className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[11px] text-ink-3 uppercase tracking-wide mb-1">Số giao dịch</p>
                <p className="font-mono font-bold text-[22px] text-ink leading-none tabular-nums">{transactions.length}</p>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {isLoading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse motion-reduce:animate-none h-16" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card relative overflow-hidden py-20 px-6 text-center">
          <div className="absolute inset-0 bg-grid mask-fade-y pointer-events-none opacity-60" aria-hidden="true" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent grid place-items-center mx-auto mb-5">
              <Receipt className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="font-display font-bold text-[17px] mb-1.5">Chưa có giao dịch nào</h3>
            <p className="text-ink-2 text-[13.5px] mb-6">Giao dịch thanh toán sẽ được ghi lại tại đây.</p>
            <Link to="/courses"><Button variant="ghost">Mua khóa học ngay</Button></Link>
          </div>
        </div>
      ) : (
        <Reveal>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-line bg-bg-2">
                    <Th>Mã đơn</Th>
                    <Th>Ngày</Th>
                    <Th>Phương thức</Th>
                    <Th className="text-right">Số tiền</Th>
                    <Th>Trạng thái</Th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0 hover:bg-bg-2 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono font-semibold text-[13px] text-ink">{t.order_code}</p>
                        {t.transaction_id && (
                          <p className="font-mono text-[11px] text-ink-3 mt-0.5">TxnID: {t.transaction_id}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12.5px] text-ink-2 whitespace-nowrap">
                        {new Date(t.paid_at ?? t.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12.5px] text-ink-2">
                        {t.payment_method ?? 'VNPay'}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[14px] text-ink text-right tabular-nums whitespace-nowrap">
                        {formatVND(t.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </AccountShell>
  );
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-5 py-3 font-mono text-[11px] font-semibold text-ink-3 uppercase tracking-[0.08em] ${className}`}>
      {children}
    </th>
  );
}
