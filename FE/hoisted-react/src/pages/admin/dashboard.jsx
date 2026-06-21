import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/store/theme';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/status-badge.jsx';
import { formatVND } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ── Mock data ──────────────────────────────────────────────────── */
const SPARK = {
  rev:    [80, 120, 100, 160, 200, 180, 240, 210, 290, 380, 350, 430],
  users:  [30, 45,  38,  52,  61,  58,  70,  65,  80,  90,  95, 112],
  active: [20, 22,  25,  23,  27,  30,  28,  32,  35,  33,  38,  42],
  orders: [8,   5,   9,   6,  12,  10,  14,  11,   8,  15,  13,  18],
};

const MOCK_TOP = [
  { title: 'JS: The Hard Parts',     revenue: 142_000_000, color: '#8B5CF6' },
  { title: 'React Performance',       revenue:  98_000_000, color: '#F7DF1E' },
  { title: 'TypeScript for JS Devs',  revenue:  76_000_000, color: '#06B6D4' },
  { title: 'Async Patterns',          revenue:  64_000_000, color: '#10B981' },
  { title: 'Node.js Internals',       revenue:  43_000_000, color: '#F59E0B' },
];

const MOCK_FUNNEL = [
  { label: 'Page view',    value: 34_848 },
  { label: 'Click Vào',   value:  3_129 },
  { label: 'Add to cart', value:  2_479 },
  { label: 'Checkout',    value:  1_848 },
  { label: 'Paid',        value:  1_284 },
];

const TIME_TABS = ['7d', '30d', '1yr', '12h'];

/* ── Mock revenue chart (30 ngày) ───────────────────────────────── */
const MOCK_REVENUE = [
  { date: '2026-05-15', revenue: 4_200_000 },
  { date: '2026-05-16', revenue: 6_800_000 },
  { date: '2026-05-17', revenue: 5_100_000 },
  { date: '2026-05-18', revenue: 8_300_000 },
  { date: '2026-05-19', revenue: 7_500_000 },
  { date: '2026-05-20', revenue: 9_200_000 },
  { date: '2026-05-21', revenue: 6_400_000 },
  { date: '2026-05-22', revenue: 11_800_000 },
  { date: '2026-05-23', revenue: 10_200_000 },
  { date: '2026-05-24', revenue: 13_500_000 },
  { date: '2026-05-25', revenue: 12_100_000 },
  { date: '2026-05-26', revenue: 9_700_000 },
  { date: '2026-05-27', revenue: 14_300_000 },
  { date: '2026-05-28', revenue: 16_800_000 },
  { date: '2026-05-29', revenue: 15_200_000 },
  { date: '2026-05-30', revenue: 18_400_000 },
  { date: '2026-05-31', revenue: 17_100_000 },
  { date: '2026-06-01', revenue: 20_500_000 },
  { date: '2026-06-02', revenue: 19_200_000 },
  { date: '2026-06-03', revenue: 22_800_000 },
  { date: '2026-06-04', revenue: 21_300_000 },
  { date: '2026-06-05', revenue: 24_600_000 },
  { date: '2026-06-06', revenue: 23_100_000 },
  { date: '2026-06-07', revenue: 26_900_000 },
  { date: '2026-06-08', revenue: 25_400_000 },
  { date: '2026-06-09', revenue: 28_700_000 },
  { date: '2026-06-10', revenue: 27_200_000 },
  { date: '2026-06-11', revenue: 31_500_000 },
  { date: '2026-06-12', revenue: 29_800_000 },
  { date: '2026-06-13', revenue: 34_600_000 },
];

/* ── Query ──────────────────────────────────────────────────────── */
function useDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/api/admin/dashboard').then(r => r.data),
    staleTime: 60_000,
  });
}

/* ── Compact number formatter ───────────────────────────────────── */
function fmtCompact(n) {
  if (!n) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}Tỷ`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString('vi-VN');
}

/* ── Page ───────────────────────────────────────────────────────── */
/* ── Theme-aware chart colors ───────────────────────────────────── */
function useChartColors() {
  const mode = useTheme((s) => s.mode);
  return mode === 'dark'
    ? {
        accent:    '#F7DF1E',
        grid:      'rgba(255,255,255,0.09)',
        tick:      '#6B7392',
        tickFaint: '#3E4660',
        bg:        '#0B0F19',
        bg2:       '#161C2F',
        ink:       '#F4F5F9',
        ink2:      '#B6BCD0',
      }
    : {
        accent:    '#4F46E5',
        grid:      'rgba(15,23,42,0.08)',
        tick:      '#475569',
        tickFaint: '#94A3B8',
        bg:        '#F8FAFC',
        bg2:       '#F1F5F9',
        ink:       '#0B0F19',
        ink2:      '#475569',
      };
}

export default function AdminDashboardPage() {
  const [timeTab, setTimeTab] = useState('30d');
  const { data, isLoading } = useDashboard();
  const chart = useChartColors();

  if (isLoading) return <Skeleton />;

  const { stats, revenueChart, topCourses, recentOrders } = data ?? {};
  const topList = (topCourses ?? MOCK_TOP).map((c, i) => ({ ...c, color: MOCK_TOP[i % MOCK_TOP.length].color }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1">// Admin / Overview</p>
          <h1 className="font-display font-bold text-[24px]">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-line rounded-lg bg-bg-2 p-0.5">
            {TIME_TABS.map(t => (
              <button key={t} onClick={() => setTimeTab(t)}
                className={cn(
                  'px-3 py-1 rounded-md font-mono text-[12px] transition-colors',
                  timeTab === t ? 'bg-bg text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
                )}>
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              try {
                const rows = (revenueChart ?? []);
                if (!rows.length) { toast.error('Chưa có dữ liệu'); return; }
                const csv = '﻿Ngày,Doanh thu (VND)\n' + rows.map(r => `${r.date},${r.revenue}`).join('\n');
                const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
                const link = Object.assign(document.createElement('a'), { href: url, download: `revenue_${Date.now()}.csv` });
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success('Đã xuất file CSV');
              } catch { toast.error('Xuất thất bại'); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <Link to="/admin/courses"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-[13px] font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Khóa mới
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Doanh thu"
          value={`${fmtCompact(stats?.totalRevenue ?? 0)}đ`}
          delta={stats?.revenuePrevMonth > 0
            ? `${(((stats.revenueThisMonth - stats.revenuePrevMonth) / stats.revenuePrevMonth) * 100).toFixed(1)}% vs tháng trước`
            : 'tháng này'}
          positive={(stats?.revenueThisMonth ?? 0) >= (stats?.revenuePrevMonth ?? 0)}
          sparkData={SPARK.rev} color={chart.accent}
        />
        <StatCard
          label="Tổng học viên"
          value={(stats?.totalUsers ?? 0).toLocaleString()}
          delta={`+${(stats?.newUsersThisWeek ?? 0)} tuần này`}
          positive
          sparkData={SPARK.users} color="#34D399"
        />
        <StatCard
          label="Đã đăng ký khóa"
          value={(stats?.activeStudents ?? 0).toLocaleString()}
          delta={`/ ${(stats?.totalUsers ?? 0).toLocaleString()} tài khoản`}
          positive
          sparkData={SPARK.active} color="#8B5CF6"
        />
        <StatCard
          label="Đơn cần xử lý"
          value={(stats?.pendingOrders ?? 0).toLocaleString()}
          delta={`/ ${(stats?.totalOrders ?? 0).toLocaleString()} tổng đơn`}
          positive={false}
          sparkData={SPARK.orders} color="#F43F5E"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue area chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">// Revenue · 30 days</p>
            {(() => {
              const cur  = stats?.revenueThisMonth ?? 0;
              const prev = stats?.revenuePrevMonth ?? 0;
              if (prev > 0) {
                const pct  = ((cur - prev) / prev * 100).toFixed(1);
                const up   = cur >= prev;
                return (
                  <span className={cn('font-mono text-[11px]', up ? 'text-success' : 'text-danger')}>
                    {up ? '▲' : '▼'} {Math.abs(pct)}% vs tháng trước
                  </span>
                );
              }
              return (
                <span className="font-mono text-[11px] text-ink-3">
                  tháng này: {fmtCompact(cur)}đ
                </span>
              );
            })()}
          </div>
          <p className="font-mono font-bold text-[22px] mb-4">
            {fmtCompact(stats?.totalRevenue ?? 487_234_000)}đ
          </p>
          <RevenueBarChart data={revenueChart ?? MOCK_REVENUE} chart={chart} />
        </div>

        {/* Top courses */}
        <div className="card p-5">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-5">
            // Top courses · Revenue
          </p>
          <div className="space-y-5">
            {topList.map(c => (
              <TopCourseRow key={c.title} course={c} max={topList[0].revenue} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
              // Recent orders · Last 10
            </p>
            <Link to="/admin/orders" className="font-mono text-[11px] text-accent hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                {['Order', 'Khách hàng', 'Khóa', 'Tổng', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[10px] text-ink-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(recentOrders ?? []).map(o => (
                <tr key={o.id} className="hover:bg-bg-2 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-accent">{o.order_code}</td>
                  <td className="px-4 py-2.5 text-ink text-[13px]">{o.userName}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-3 text-[12px]">{o.itemCount ?? 1} khóa</td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-[12px]">{formatVND(o.total_amount)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.status?.toLowerCase()} /></td>
                </tr>
              ))}
              {!(recentOrders?.length) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center font-mono text-[12px] text-ink-3">
                    // Chưa có đơn hàng
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Funnel */}
        <div className="card p-5">
          <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-5">
            // Funnel · Last 30d
          </p>
          <div className="space-y-4">
            {MOCK_FUNNEL.map(step => (
              <FunnelRow key={step.label} step={step} max={MOCK_FUNNEL[0].value} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function RevenueBarChart({ data, chart }) {
  const id = 'revGrad';
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={chart.accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: chart.tick }}
          tickFormatter={d => {
            if (!d) return '';
            const [, m, day] = d.split('-');
            return `${day}/${m}`;
          }}
          axisLine={false} tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fontSize: 10, fill: chart.tickFaint }}
          tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`}
          axisLine={false} tickLine={false}
          width={36}
        />

        <Tooltip
          cursor={{ stroke: chart.tick, strokeWidth: 1, strokeDasharray: '4 2' }}
          contentStyle={{
            background: chart.bg,
            border: `1px solid ${chart.grid}`,
            borderRadius: 8,
            fontSize: 12,
            color: chart.ink,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          }}
          itemStyle={{ color: chart.ink2 }}
          formatter={v => [formatVND(v), 'Doanh thu']}
          labelFormatter={d => {
            if (!d) return '';
            const [, m, day] = d.split('-');
            return `${day}/${m}`;
          }}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chart.accent}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
          activeDot={{ r: 4, fill: chart.accent, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value, delta, positive, sparkData, color }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="font-mono font-bold text-[22px] text-ink leading-none mb-1">{value}</p>
      <p className={cn('font-mono text-[11px] mb-3', positive ? 'text-success' : 'text-danger')}>
        {positive ? '▲' : '▼'} {delta}
      </p>
      <ResponsiveContainer width="100%" height={36}>
        <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopCourseRow({ course, max }) {
  const pct = Math.round((course.revenue / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] text-ink truncate flex-1 mr-2">{course.title}</span>
        <span className="font-mono text-[11px] text-ink-3 shrink-0">
          {(course.revenue / 1_000_000).toFixed(0)}M
        </span>
      </div>
      <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: course.color }} />
      </div>
    </div>
  );
}

function FunnelRow({ step, max }) {
  const pct = Math.round((step.value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] text-ink">{step.label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">
            {step.value.toLocaleString()}
          </span>
          <span className="font-mono text-[10px] text-ink-3">{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-8 animate-pulse space-y-6">
      <div className="h-8 bg-bg-3 rounded w-40" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-bg-3 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="h-72 bg-bg-3 rounded-xl col-span-2" />
        <div className="h-72 bg-bg-3 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="h-52 bg-bg-3 rounded-xl col-span-2" />
        <div className="h-52 bg-bg-3 rounded-xl" />
      </div>
    </div>
  );
}
