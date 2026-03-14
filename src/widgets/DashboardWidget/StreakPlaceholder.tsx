'use client';

// =============================================================================
// widgets/DashboardWidget/StreakPlaceholder.tsx
// Layer: widgets → DashboardWidget
// Polished placeholder for the 30-day activity heatmap (full component = future task).
// Blueprint §2.6: "Streak widget: horizontal calendar heatmap, 30-day amber/grey cells"
// =============================================================================

import React from 'react';

import { motion } from 'framer-motion';
import { Flame, CalendarDays } from 'lucide-react';

// ---------------------------------------------------------------------------
// Generate deterministic fake heatmap cells for visual fidelity
// ---------------------------------------------------------------------------

function generateDemoWeeks(): ('active' | 'inactive' | 'empty')[][] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun

  const cells: ('active' | 'inactive')[] = [];
  for (let i = 29; i >= 0; i--) {
    // Produce a plausible streak pattern — mostly active with some gaps
    cells.push(Math.random() > 0.25 ? 'active' : 'inactive');
  }

  // Pad current week to end on today (fill remaining days with 'empty')
  const totalCells = cells.length;
  const remainder = (dayOfWeek + 1) % 7 === 0 ? 0 : 7 - ((totalCells + dayOfWeek) % 7);
  const padded: ('active' | 'inactive' | 'empty')[] = [
    ...cells,
    ...(Array(remainder).fill('empty') as 'empty'[]),
  ];

  // Split into weeks (columns of 7)
  const weeks: ('active' | 'inactive' | 'empty')[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Heatmap cell
// ---------------------------------------------------------------------------

const CELL_CLASSES: Record<'active' | 'inactive' | 'empty', string> = {
  active: 'bg-[var(--color-accent-amber)] opacity-80',
  inactive: 'bg-[var(--color-border)]',
  empty: 'bg-transparent',
};

// ---------------------------------------------------------------------------
// StreakPlaceholder — public component
// ---------------------------------------------------------------------------

interface StreakPlaceholderProps {
  currentStreak?: number;
  longestStreak?: number;
}

export function StreakPlaceholder({
  currentStreak = 0,
  longestStreak = 0,
}: StreakPlaceholderProps) {
  const weeks = React.useMemo(() => generateDemoWeeks(), []);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <section
      aria-label="Study streak"
      className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[var(--color-accent-amber)]" aria-hidden="true" />
          <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
            Study Streak
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span>
            <span className="font-semibold text-[var(--color-accent-amber)]">{currentStreak}</span>{' '}
            day streak
          </span>
          <span>
            Best:{' '}
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {longestStreak}
            </span>
          </span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div aria-label="30-day activity heatmap (visual demo — full data coming soon)">
        <div className="flex items-start gap-1">
          {/* Day labels column */}
          <div className="mr-1 flex flex-col gap-1" aria-hidden="true">
            {dayLabels.map((d, i) => (
              <span
                key={i}
                className="flex h-4 w-3 items-center text-[10px] leading-none text-[var(--color-text-muted)]"
              >
                {i % 2 === 1 ? d : ''}
              </span>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-1" aria-hidden="true">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + di) * 0.008, duration: 0.2 }}
                    className={['h-4 w-4 rounded-sm', CELL_CLASSES[day]].join(' ')}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* "Coming soon" notice */}
      <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <CalendarDays size={12} aria-hidden="true" />
        Full streak history and streaks analytics — coming soon.
      </p>
    </section>
  );
}
