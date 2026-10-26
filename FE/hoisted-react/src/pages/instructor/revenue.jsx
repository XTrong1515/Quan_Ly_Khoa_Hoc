import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Wallet, TrendingUp, BadgeCheck, Hourglass, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { RevenueAreaChart, useChartColors } from '@/components/charts/revenue-area-chart.jsx';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

const RANGES = [[7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày'], [365, '12 tháng']];

function rangeParams(days) {
  const to = new Date();
  const from = new Date(); from.setDate(to.getDate() - (days - 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function InstructorRevenuePage() {
  const [days, setDays] = useState(30);
  const chart = useChartColors();
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-revenue', days],
    queryFn: () => api.get('/api/instructor/revenue', { params: rangeParams(days) }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const s = data?.summary;
  const rangeEarned = (data?.series ?? []).reduce((t, d) => t + d.earned, 0);
  const cards = [
    { label: 'Tổng bán (đã thanh toán)', value: s?.gross, icon: TrendingUp, hint: `${s?.sales ?? 0} lượt mua` },
    { label: 'Thu nhập của bạn',          value: s?.earned, icon: Wallet, hint: `sau hoa hồng ${data?.commissionRate ?? '—'}%` },
    { label: 'Đã nhận',                   value: s?.paidOut, icon: BadgeCheck },
    { label: 'Số dư chờ chi trả',          value: s ? s.balance + s.pending : undefined, icon: Hourglass,
      hint: s?.pending ? `${formatVND(s.pending)} đang được xử lý` : 'chi trả định kỳ bởi Hoisted' },
  ];

  return (
    <div className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1.5"><span className="text-accent">~/instructor</span> <span className="text-ink-3">/ doanh-thu</span></p>
          <h1 className="font-display font-bold text-[24px]">Doanh thu</h1>
        </div>
      </div>

      {data && !data.bankReady && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg bg-js/10 text-js text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Bạn chưa cập nhật tài khoản ngân hàng — Hoisted chưa thể chi trả doanh thu.</span>
          <Link to="/instructor/profile" className="font-semibold underline">Cập nhật ngay</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
              <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">{label}</p>
            </div>
            <p className="font-mono font-bold text-[20px] text-ink leading-none tabular-nums">
              {isLoading || value === undefined ? '…' : formatVND(value)}
            </p>
            {hint && <p className="mt-1.5 font-mono text-[10.5px] text-ink-3">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Thu nhập theo ngày</p>
            <p className="font-mono font-bold text-[18px] text-ink mt-1">{formatVND(rangeEarned)}</p>
          </div>
          <div className="flex gap-1">
            {RANGES.map(([v, l]) => (
              <button key={v} onClick={() => setDays(v)}
                className={cn('px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                  days === v ? 'bg-accent/10 text-accent' : 'text-ink-3 hover:text-ink hover:bg-bg-2')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <RevenueAreaChart
          data={(data?.series ?? []).map((d) => ({ date: d.day, revenue: d.earned }))}
          chart={chart} range={days} label="Thu nhập"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <p className="px-5 pt-4 pb-3 font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Theo khóa học ({RANGES.find(([v]) => v === days)?.[1]})</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-line bg-bg-2">
                {['Khóa học', 'Lượt mua', 'Doanh số', 'Thu nhập'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data?.courses ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center font-mono text-[12px] text-ink-3">// Chưa có lượt mua trong khoảng này</td></tr>
              )}
              {(data?.courses ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5"><Link to={`/courses/${c.slug}`} className="text-ink hover:text-accent line-clamp-1">{c.title}</Link></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-ink-2">{c.sales}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-ink-2">{formatVND(c.gross)}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-success">{formatVND(c.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <p className="px-5 pt-4 pb-3 font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">Lịch sử chi trả</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-line bg-bg-2">
                {['Ngày tạo', 'Số tiền', 'Trạng thái', 'Mã GD'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data?.payouts ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center font-mono text-[12px] text-ink-3">// Chưa có khoản chi trả</td></tr>
              )}
              {(data?.payouts ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-ink-2">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-ink">{formatVND(p.amount)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status === 'PAID' ? 'paid' : 'pending'} /></td>
                  <td className="px-4 py-2.5 font-mono text-[11.5px] text-ink-3">{p.bankRef ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-5 font-mono text-[11px] text-ink-3">
        // Doanh thu chỉ tính đơn đã thanh toán; tỷ lệ hoa hồng được chốt tại thời điểm bán — thay đổi tỷ lệ sau này không ảnh hưởng đơn cũ.
      </p>
    </div>
  );
}
