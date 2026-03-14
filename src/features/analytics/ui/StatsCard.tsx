// =============================================================================
// features/analytics/ui/StatsCard.tsx
// Layer: features → analytics → ui
// Presentational. No Firebase. No direct API calls.
// =============================================================================

'use client';

import React from 'react';

import {
  Flame,
  BookOpen,
  Layers,
  Trophy,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import { Card, CardContent } from '@/shared/ui';

import styles from './StatsCard.module.css';
import type { StatCardConfig, StatCardVariant } from '../model/types';

// ---------------------------------------------------------------------------
// Icon registry (avoids dynamic string→component lookup at render time)
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ElementType> = {
  Flame,
  BookOpen,
  Layers,
  Trophy,
  Clock,
  RefreshCw,
};

// ---------------------------------------------------------------------------
// Variant → CSS class
// ---------------------------------------------------------------------------
const VARIANT_CLASS: Record<StatCardVariant, string> = {
  primary: styles.variantPrimary,
  amber: styles.variantAmber,
  emerald: styles.variantEmerald,
  violet: styles.variantViolet,
};

// ---------------------------------------------------------------------------
// StatsCard
// ---------------------------------------------------------------------------
interface StatsCardProps {
  config: StatCardConfig;
  /** Animate with stagger delay (0-indexed) */
  index?: number;
}

export function StatsCard({ config, index = 0 }: StatsCardProps) {
  const IconComponent = ICON_MAP[config.icon] ?? Flame;
  const variantClass = VARIANT_CLASS[config.variant];

  const TrendIcon =
    config.trend?.direction === 'up'
      ? TrendingUp
      : config.trend?.direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <Card
      className={`${styles.card} ${variantClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className={styles.content}>
        {/* Icon badge */}
        <div className={`${styles.iconWrap} ${variantClass}`} aria-hidden>
          <IconComponent size={18} strokeWidth={2} />
        </div>

        {/* Value */}
        <div className={styles.valueRow}>
          <span className={styles.value}>{config.value}</span>
          {config.unit && <span className={styles.unit}>{config.unit}</span>}
        </div>

        {/* Label + optional trend */}
        <div className={styles.meta}>
          <span className={styles.label}>{config.label}</span>
          {config.trend && (
            <span
              className={`${styles.trend} ${
                config.trend.direction === 'up'
                  ? styles.trendUp
                  : config.trend.direction === 'down'
                    ? styles.trendDown
                    : styles.trendNeutral
              }`}
            >
              <TrendIcon size={11} />
              {config.trend.label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StatsCardGrid — responsive grid of StatsCard
// ---------------------------------------------------------------------------
interface StatsCardGridProps {
  configs: StatCardConfig[];
}

export function StatsCardGrid({ configs }: StatsCardGridProps) {
  return (
    <div className={styles.grid} role="list">
      {configs.map((config, i) => (
        <div key={config.id} role="listitem">
          <StatsCard config={config} index={i} />
        </div>
      ))}
    </div>
  );
}
