'use client';

// =============================================================================
// features/study-plan/ui/StudyPlanSkeleton.tsx
// Layer: features → study-plan → ui
// =============================================================================

import React from 'react';

import { Skeleton, CardSkeleton, StatSkeleton } from '@/shared/ui';

import styles from './StudyPlanSkeleton.module.css';

export function StudyPlanSkeleton() {
  return (
    <div className={styles.root}>
      {/* Page header skeleton */}
      <div className={styles.pageHeader}>
        <Skeleton style={{ width: 220, height: 32, borderRadius: 'var(--radius-sm)' }} />
        <Skeleton
          style={{ width: 140, height: 20, borderRadius: 'var(--radius-sm)', marginTop: 8 }}
        />
      </div>

      {/* Stats row skeleton */}
      <div className={styles.statsRow}>
        {[0, 1, 2, 3].map((i) => (
          <StatSkeleton key={i} />
        ))}
      </div>

      {/* Main grid */}
      <div className={styles.mainGrid}>
        {/* Calendar skeleton */}
        <div className={styles.calendarSection}>
          {/* Toolbar */}
          <div className={styles.calendarToolbar}>
            <Skeleton style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)' }} />
            <Skeleton style={{ width: 200, height: 28, borderRadius: 'var(--radius-sm)' }} />
            <Skeleton style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)' }} />
            <div style={{ flex: 1 }} />
            <Skeleton style={{ width: 120, height: 32, borderRadius: 'var(--radius-md)' }} />
            <Skeleton style={{ width: 100, height: 32, borderRadius: 'var(--radius-md)' }} />
          </div>

          {/* Day headers */}
          <div className={styles.dayHeaderRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} style={{ height: 16, borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>

          {/* Calendar cells — 5 weeks × 7 days */}
          {[0, 1, 2, 3, 4].map((week) => (
            <div key={week} className={styles.calendarWeekRow}>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <Skeleton
                  key={day}
                  style={{
                    height: 96,
                    borderRadius: 0,
                    animationDelay: `${(week * 7 + day) * 20}ms`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar skeleton (exam countdown + session list) */}
        <div className={styles.sidebar}>
          {/* Section label */}
          <Skeleton style={{ width: 120, height: 16, borderRadius: 'var(--radius-sm)' }} />

          {/* Exam countdown card skeleton */}
          {[0, 1].map((i) => (
            <div key={i} className={styles.countdownCardSkeleton}>
              <Skeleton
                style={{
                  width: '55%',
                  height: 12,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 8,
                }}
              />
              <Skeleton
                style={{
                  width: '75%',
                  height: 20,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 20,
                }}
              />
              <div className={styles.digitsSkeleton}>
                {[0, 1, 2].map((j) => (
                  <Skeleton
                    key={j}
                    style={{ width: 64, height: 68, borderRadius: 'var(--radius-md)' }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Today's sessions */}
          <Skeleton
            style={{ width: 100, height: 16, borderRadius: 'var(--radius-sm)', marginTop: 8 }}
          />
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.sessionRowSkeleton}>
              <Skeleton style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton style={{ width: '70%', height: 14, borderRadius: 'var(--radius-sm)' }} />
                <Skeleton style={{ width: '45%', height: 12, borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
