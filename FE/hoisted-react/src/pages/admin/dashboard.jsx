import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip,
  LineChart, Line,
} from 'recharts';
import { Download, Plus } from 'lucide-react';
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
export default function AdminDashboardPage() {
  const [timeTab, setTimeTab] = useState('30d');
  const { data, isLoading } = useDashboard();

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
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-[13px] text-ink-2 hover:bg-bg-2 transition-colors">
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
          value={`${fmtCompact(stats?.totalRevenue ?? 487_200_000)}đ`}
          delta="+12.4%" positive
          sparkData={SPARK.rev} color="var(--color-accent)"
        />
        <StatCard
          label="Học viên mới"
          value={(stats?.totalUsers ?? 1_284).toLocaleString()}
          delta="+48.25" positive
          sparkData={SPARK.users} color="var(--color-success)"
        />
        <StatCard
          label="Đang học"
          value={(stats?.activeStudents ?? 127).toLocaleString()}
          delta="+43 · 0 ngừng" positive
          sparkData={SPARK.active} color="#8B5CF6"
        />
        <StatCard
          label="Đơn cần xử lý"
          value={(stats?.pendingOrders ?? 24).toLocaleString()}
          delta="-5" positive={false}
          sparkData={SPARK.orders} color="var(--color-danger)"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue area chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] text-ink-3 uppercase tracking-widest">// Revenue · 30 days</p>
            <span className="font-mono text-[11px] text-success">+12.4% vs prev</span>
          </div>
          <p className="font-mono font-bold text-[22px] mb-4">
            {fmtCompact(stats?.totalRevenue ?? 487_234_000)}đ
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueChart ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-ink-3)' }}
                tickFormatter={d => d?.slice(5)}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-line)', borderRadius: 8, fontSize: 12 }}
                formatter={v => [formatVND(v), 'Doanh thu']}
                labelFormatter={d => d?.slice(5)}
              />
              <Area type="monotone" dataKey="revenue"
                stroke="var(--color-accent)" strokeWidth={2}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
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
