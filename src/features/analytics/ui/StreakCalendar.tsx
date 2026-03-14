// =============================================================================
// features/analytics/ui/StreakCalendar.tsx
// Layer: features → analytics → ui
// 30-day horizontal heatmap calendar.
// Amber cells = study activity; grey = no activity.
// =============================================================================

'use client';

import React, { useMemo } from 'react';

import styles from './StreakCalendar.module.css';
import type { StreakDay } from '../model/types';
import { formatStreakDate } from '../model/types';

// ---------------------------------------------------------------------------
// Helper: build a 30-day window ending today, merging API data
// ---------------------------------------------------------------------------
function buildCalendarDays(streakData: StreakDay[]): StreakDay[] {
  const dataMap = new Map(streakData.map((d) => [d.date, d]));
  const days: StreakDay[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(
      dataMap.get(iso) ?? {
        date: iso,
        hasActivity: false,
        intensityLevel: 0,
      },
    );
  }

  return days;
}

// ---------------------------------------------------------------------------
// Individual day cell
// ---------------------------------------------------------------------------
interface DayCellProps {
  day: StreakDay;
  isToday: boolean;
  index: number;
}

function DayCell({ day, isToday, index }: DayCellProps) {
  const label = formatStreakDate(day.date);
  const intensityClass = day.hasActivity
    ? ([styles.intensity1, styles.intensity2, styles.intensity3][
        (day.intensityLevel as 1 | 2 | 3) - 1
      ] ?? styles.intensity1)
    : styles.intensityNone;

  return (
    <div
      className={`${styles.cell} ${intensityClass} ${isToday ? styles.today : ''}`}
      role="gridcell"
      aria-label={`${label}: ${day.hasActivity ? `activity level ${day.intensityLevel}` : 'no activity'}`}
      title={label}
      style={{ animationDelay: `${index * 20}ms` }}
    />
  );
}

// ---------------------------------------------------------------------------
// StreakCalendar
// ---------------------------------------------------------------------------
interface StreakCalendarProps {
  data: StreakDay[];
  currentStreak: number;
}

export function StreakCalendar({ data, currentStreak }: StreakCalendarProps) {
  const days = useMemo(() => buildCalendarDays(data), [data]);

  const todayIso = new Date().toISOString().slice(0, 10);

  // Day labels for first visible occurrence of each month
  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    let lastMonth = -1;
    days.forEach((day, i) => {
      const month = new Date(day.date).getMonth();
      if (month !== lastMonth) {
        labels.push({
          index: i,
          label: new Date(day.date).toLocaleDateString('en-NG', { month: 'short' }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [days]);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Study Streak</h3>
          <span className={styles.streakBadge}>
            🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        <p className={styles.subtitle}>Your activity over the last 30 days</p>
      </div>

      {/* Month label row */}
      <div className={styles.monthRow} aria-hidden>
        {days.map((day, i) => {
          const monthLabel = monthLabels.find((m) => m.index === i);
          return (
            <div key={day.date} className={styles.monthCell}>
              {monthLabel ? <span className={styles.monthLabel}>{monthLabel.label}</span> : null}
            </div>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className={styles.grid} role="grid" aria-label="Streak calendar">
        {days.map((day, i) => (
          <DayCell key={day.date} day={day} isToday={day.date === todayIso} index={i} />
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend} aria-hidden>
        <span className={styles.legendLabel}>Less</span>
        <div className={`${styles.legendCell} ${styles.intensityNone}`} />
        <div className={`${styles.legendCell} ${styles.intensity1}`} />
        <div className={`${styles.legendCell} ${styles.intensity2}`} />
        <div className={`${styles.legendCell} ${styles.intensity3}`} />
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
