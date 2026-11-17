'use client';
import { colors } from '@tripflix/tokens';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatClock, formatNumber } from '../ui/format';

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    boxShadow: 'none',
    fontSize: 12,
    color: colors.text,
  },
  labelStyle: { color: colors.textMuted, fontWeight: 600 },
};
const axisTick = { fontSize: 11, fill: colors.textSubtle };

export interface TrendPoint {
  at: number;
  pending: number;
  urgent: number;
}

/** Hàng chờ theo thời gian: hai lớp miền chồng (tổng chờ duyệt và phần khẩn cấp). */
export function QueueTrendChart({
  points,
  labels,
}: {
  points: TrendPoint[];
  labels: { pending: string; urgent: string };
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="queue-pending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.teal} stopOpacity={0.28} />
            <stop offset="100%" stopColor={colors.teal} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="queue-urgent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.danger} stopOpacity={0.3} />
            <stop offset="100%" stopColor={colors.danger} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.surfaceMuted} vertical={false} />
        <XAxis
          dataKey="at"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value: number) => formatClock(value).slice(0, 5)}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          minTickGap={40}
        />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(value) => formatClock(Number(value))}
          formatter={(value, name) => [formatNumber(Number(value)), name === 'pending' ? labels.pending : labels.urgent]}
        />
        <Area
          type="monotone"
          dataKey="pending"
          stroke={colors.teal}
          strokeWidth={2}
          fill="url(#queue-pending)"
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="urgent"
          stroke={colors.danger}
          strokeWidth={2}
          fill="url(#queue-urgent)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface MixSlice {
  name: string;
  value: number;
  color: string;
}

export function MixDonut({ slices, centerLabel, centerValue }: { slices: MixSlice[]; centerLabel: string; centerValue: string }) {
  return (
    <div className="relative h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={56}
            outerRadius={80}
            paddingAngle={slices.filter((slice) => slice.value > 0).length > 1 ? 3 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(value) => formatNumber(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-2xl font-bold tabular-nums text-text">{centerValue}</strong>
        <span className="text-[11px] text-text-muted">{centerLabel}</span>
      </div>
    </div>
  );
}

export interface ThroughputBucket {
  hour: string;
  staff: number;
  system: number;
}

export function ThroughputChart({
  buckets,
  labels,
}: {
  buckets: ThroughputBucket[];
  labels: { staff: string; system: string };
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap="20%">
        <CartesianGrid stroke={colors.surfaceMuted} vertical={false} />
        <XAxis dataKey="hour" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ fill: colors.surface }}
          formatter={(value, name) => [formatNumber(Number(value)), name === 'staff' ? labels.staff : labels.system]}
        />
        <Bar dataKey="staff" stackId="actor" fill={colors.navy} radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="system" stackId="actor" fill={colors.teal} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
