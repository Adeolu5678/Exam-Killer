// =============================================================================
// features/analytics/ui/ProgressChart.tsx
// Layer: features → analytics → ui
// Recharts area chart — styled via CSS variables. Dark-first aesthetic.
// Lazy-loadable (no 'use server' concerns — this is 'use client').
// =============================================================================

'use client';

import React, { useCallback } from 'react';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import styles from './ProgressChart.module.css';
import { useAnalyticsStore } from '../model/analyticsStore';
import type { ChartRange } from '../model/analyticsStore';
import type { ProgressDataPoint } from '../model/types';

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: entry.color }} />
          <span className={styles.tooltipName}>{entry.name}</span>
          <span className={styles.tooltipValue}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Range selector button
// ---------------------------------------------------------------------------
interface RangeBtnProps {
  range: ChartRange;
  active: boolean;
  onClick: (r: ChartRange) => void;
}

function RangeBtn({ range, active, onClick }: RangeBtnProps) {
  return (
    <button
      className={`${styles.rangeBtn} ${active ? styles.rangeBtnActive : ''}`}
      onClick={() => onClick(range)}
      aria-pressed={active}
    >
      {range}d
    </button>
  );
}

// ---------------------------------------------------------------------------
// ProgressChart
// ---------------------------------------------------------------------------
interface ProgressChartProps {
  data: ProgressDataPoint[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  const { chartRange, setChartRange } = useAnalyticsStore();

  // Format date for XAxis tick — show Mon/day
  const formatXAxis = useCallback((tickValue: string) => {
    const d = new Date(tickValue);
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  }, []);

  // Throttle tick count based on range
  const tickCount = chartRange === 7 ? 7 : chartRange === 14 ? 7 : 6;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Study Progress</h3>
          <p className={styles.subtitle}>Daily activity across the selected period</p>
        </div>
        <div className={styles.rangeGroup} role="group" aria-label="Chart time range">
          {([7, 14, 30] as ChartRange[]).map((r) => (
            <RangeBtn key={r} range={r} active={chartRange === r} onClick={setChartRange} />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {/* Study minutes gradient */}
              <linearGradient id="gradMinutes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3D7BF5" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3D7BF5" stopOpacity={0} />
              </linearGradient>
              {/* Cards gradient */}
              <linearGradient id="gradCards" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />

            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tickCount={tickCount}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                paddingTop: '12px',
              }}
            />

            <Area
              type="monotone"
              dataKey="studyMinutes"
              name="Study Minutes"
              stroke="#3D7BF5"
              strokeWidth={2}
              fill="url(#gradMinutes)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#3D7BF5',
                stroke: 'var(--color-bg-elevated)',
                strokeWidth: 2,
              }}
            />

            <Area
              type="monotone"
              dataKey="cardsReviewed"
              name="Cards Reviewed"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#gradCards)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#8B5CF6',
                stroke: 'var(--color-bg-elevated)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
