import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTheme } from '@/store/theme';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { Download, Plus, Wallet, Users as UsersIcon, GraduationCap, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/page-header.jsx';
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

/* ── Revenue range selector ─────────────────────────────────────── */
const RANGE_TABS = [
  { value: 7,   label: '7 ngày'  },
  { value: 30,  label: '1 tháng' },
  { value: 60,  label: '60 ngày' },
  { value: 365, label: '1 năm'   },
];

/* Fill days without orders with 0 so the line is continuous */
function fillDays(rows, days) {
  const map = new Map((rows ?? []).map((r) => [r.date, Number(r.revenue)]));
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: iso, revenue: map.get(iso) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/* ── Query ──────────────────────────────────────────────────────── */
function useDashboard(range) {
  return useQuery({
    queryKey: ['admin-dashboard', range],
    queryFn: () => api.get('/api/admin/dashboard', { params: { range } }).then(r => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
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
  const [range, setRange] = useState(30);
  const { data, isLoading } = useDashboard(range);
  const chart = useChartColors();

  if (isLoading) return <Skeleton />;

  const { stats, revenueChart, topCourses, recentOrders } = data ?? {};
  const topList = (topCourses ?? MOCK_TOP).map((c, i) => ({ ...c, color: MOCK_TOP[i % MOCK_TOP.length].color }));

  const filledRevenue = fillDays(revenueChart ?? [], range);
  const rangeTotal = filledRevenue.reduce((s, r) => s + r.revenue, 0);
  const rangeLabel = RANGE_TABS.find((t) => t.value === range)?.label ?? `${range} ngày`;

  const exportCsv = () => {
    try {
      const rows = filledRevenue;
      if (!rows.length) { toast.error('Chưa có dữ liệu'); return; }
      const csv = '﻿Ngày,Doanh thu (VND)\n' + rows.map(r => `${r.date},${r.revenue}`).join('\n');
      const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: `revenue_${Date.now()}.csv` });
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file CSV');
    } catch { toast.error('Xuất thất bại'); }
  };

  return (
    <div className="p-5 sm:p-8">
      <AdminPageHeader
        path="tổng-quan"
        title="Dashboard"
        desc="Toàn cảnh doanh thu, học viên và đơn hàng"
        actions={
          <>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 hover:border-accent/40 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" /> Xuất CSV
            </button>
            <Link
              to="/admin/courses"
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-accent text-accent-ink text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgb(var(--accent)/0.3)]"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Khóa mới
            </Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Wallet}
          label="Doanh thu"
          value={`${fmtCompact(stats?.totalRevenue ?? 0)}đ`}
          delta={stats?.revenuePrevMonth > 0
            ? `${(((stats.revenueThisMonth - stats.revenuePrevMonth) / stats.revenuePrevMonth) * 100).toFixed(1)}% vs tháng trước`
            : 'tháng này'}
          positive={(stats?.revenueThisMonth ?? 0) >= (stats?.revenuePrevMonth ?? 0)}
          sparkData={SPARK.rev} color={chart.accent}
        />
        <StatCard
          icon={UsersIcon}
          label="Tổng học viên"
          value={(stats?.totalUsers ?? 0).toLocaleString()}
          delta={`+${(stats?.newUsersThisWeek ?? 0)} tuần này`}
          positive
          sparkData={SPARK.users} color="#34D399"
        />
        <StatCard
          icon={GraduationCap}
          label="Đã đăng ký khóa"
          value={(stats?.activeStudents ?? 0).toLocaleString()}
          delta={`/ ${(stats?.totalUsers ?? 0).toLocaleString()} tài khoản`}
          positive
          sparkData={SPARK.active} color="#8B5CF6"
        />
        <StatCard
          icon={Hourglass}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">
              // Doanh thu · {rangeLabel}
            </p>
            <div className="flex border border-line rounded-lg bg-bg-2 p-0.5" role="group" aria-label="Khoảng thời gian">
              {RANGE_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setRange(t.value)}
                  aria-pressed={range === t.value}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-mono text-[11.5px] transition-colors cursor-pointer',
                    range === t.value ? 'bg-bg text-accent font-semibold shadow-sm' : 'text-ink-3 hover:text-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3 mb-4">
            <p className="font-mono font-bold text-[24px] leading-none tabular-nums">
              {fmtCompact(rangeTotal)}đ
            </p>
            <span className="font-mono text-[11px] text-ink-3 pb-0.5">
              trong {rangeLabel.toLowerCase()} qua
            </span>
          </div>
          <RevenueAreaChart data={filledRevenue} chart={chart} range={range} />
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
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

function RevenueAreaChart({ data, chart, range }) {
  const id = 'revGrad';
  const nonZeroDays = data.filter((d) => d.revenue > 0);
  const avg = nonZeroDays.length
    ? data.reduce((s, d) => s + d.revenue, 0) / data.length
    : 0;
  // With sparse data the line hugs zero — mark the actual sale days with dots
  const showDots = nonZeroDays.length > 0 && nonZeroDays.length <= 15;
  const tickInterval = Math.max(0, Math.ceil(data.length / 8) - 1);
  const yMax = Math.max(...data.map((d) => d.revenue), 0);

  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return range >= 365 ? `${m}/${y.slice(2)}` : `${day}/${m}`;
  };

  if (yMax === 0) {
    return (
      <div className="h-[220px] grid place-items-center">
        <p className="font-mono text-[12px] text-ink-3">Chưa có doanh thu trong khoảng thời gian này</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={chart.accent} stopOpacity={0.35} />
            <stop offset="60%"  stopColor={chart.accent} stopOpacity={0.08} />
            <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: chart.tick }}
          tickFormatter={fmtDate}
          axisLine={false} tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fontSize: 10, fill: chart.tickFaint }}
          tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(v < 10_000_000 ? 1 : 0)}M` : `${(v / 1_000).toFixed(0)}K`}
          axisLine={false} tickLine={false}
          width={44}
          domain={[0, 'auto']}
        />

        <Tooltip
          cursor={{ stroke: chart.tick, strokeWidth: 1, strokeDasharray: '4 2' }}
          contentStyle={{
            background: chart.bg,
            border: `1px solid ${chart.grid}`,
            borderRadius: 10,
            fontSize: 12,
            color: chart.ink,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
          itemStyle={{ color: chart.ink2 }}
          formatter={v => [formatVND(v), 'Doanh thu']}
          labelFormatter={d => {
            if (!d) return '';
            const [y, m, day] = d.split('-');
            return `${day}/${m}/${y}`;
          }}
        />

        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke={chart.tickFaint}
            strokeDasharray="6 4"
            label={{
              value: `TB ${(avg / 1_000_000).toFixed(1)}M/ngày`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: chart.tick,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chart.accent}
          strokeWidth={2.5}
          fill={`url(#${id})`}
          dot={showDots ? { r: 3.5, fill: chart.accent, strokeWidth: 2, stroke: chart.bg } : false}
          activeDot={{ r: 5, fill: chart.accent, strokeWidth: 2, stroke: chart.bg }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StatCard({ icon: Icon, label, value, delta, positive, sparkData, color }) {
  return (
    <div className="card p-5 hover:border-accent/25 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.12em]">{label}</p>
        <div
          className="w-8 h-8 rounded-lg grid place-items-center"
          style={{ background: `${color}1a`, color }}
          aria-hidden="true"
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="font-mono font-bold text-[24px] text-ink leading-none mb-1.5 tabular-nums">{value}</p>
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
