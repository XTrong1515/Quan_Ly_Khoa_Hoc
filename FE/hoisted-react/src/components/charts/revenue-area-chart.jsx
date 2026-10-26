import { useTheme } from '@/store/theme';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { formatVND } from '@/lib/format';

/** Biểu đồ doanh thu theo ngày — dùng chung cho dashboard admin và trang doanh thu giảng viên. */
export function useChartColors() {
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

/** data: [{ date: 'YYYY-MM-DD', revenue }] */
export function RevenueAreaChart({ data, chart, range, label = 'Doanh thu' }) {
  const id = `revGrad-${label.replace(/W/g, '')}`;
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
          formatter={v => [formatVND(v), label]}
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
