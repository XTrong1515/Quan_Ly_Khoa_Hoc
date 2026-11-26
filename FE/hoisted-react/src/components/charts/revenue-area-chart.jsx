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
        accent:    '#FFCF33',
        grid:      'rgba(176,192,240,0.16)',
        tick:      '#92A0CC',
        tickFaint: '#5B6A99',
        bg:        '#101C40',
        bg2:       '#1B2A58',
        ink:       '#F0F3FC',
        ink2:      '#BEC8E6',
        edge:      '#96AAE8',
        shadow:    '#000000',
      }
    : {
        accent:    '#2547D0',
        grid:      'rgba(14,27,61,0.12)',
        tick:      '#374469',
        tickFaint: '#525F85',
        bg:        '#FFFFFF',
        bg2:       '#E5EAF7',
        ink:       '#0E1B3D',
        ink2:      '#374469',
        edge:      '#0E1B3D',
        shadow:    '#0E1B3D',
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
          {/* Nền vùng phẳng (không gradient) + chấm pixel — hợp neo-brutalism */}
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={chart.accent} fillOpacity={0.12} />
            <rect width="2" height="2" fill={chart.accent} fillOpacity={0.45} />
          </pattern>
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
            border: `2px solid ${chart.edge}`,
            borderRadius: 3,
            fontSize: 12,
            fontWeight: 600,
            color: chart.ink,
            boxShadow: `4px 4px 0 0 ${chart.shadow}`,
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
          type="linear"
          dataKey="revenue"
          stroke={chart.accent}
          strokeWidth={3}
          strokeLinejoin="miter"
          fill={`url(#${id})`}
          dot={showDots ? { r: 4, fill: chart.accent, strokeWidth: 2, stroke: chart.edge } : false}
          activeDot={{ r: 6, fill: chart.accent, strokeWidth: 2, stroke: chart.edge }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
