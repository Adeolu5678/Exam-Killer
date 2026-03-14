'use client';

// =============================================================================
// features/study-plan/ui/ExamCountdown.tsx
// Layer: features → study-plan → ui
// FSD: imports only from @/shared/ui and local model
// =============================================================================

import React, { useEffect, useState, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';

import { Badge, Skeleton, Card } from '@/shared/ui';

import styles from './ExamCountdown.module.css';
import { computeCountdown } from '../model/types';
import type { ExamDate, CountdownData } from '../model/types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DigitDisplayProps {
  value: number;
  label: string;
  isUrgent: boolean;
}

function DigitDisplay({ value, label, isUrgent }: DigitDisplayProps) {
  return (
    <div className={styles.digitBlock} data-urgent={isUrgent}>
      <div className={styles.digitValue} aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className={styles.digitLabel}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function NoExamState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.emptyState}>
      <svg className={styles.emptyIllustration} viewBox="0 0 120 100" fill="none" aria-hidden>
        <rect
          x="20"
          y="20"
          width="80"
          height="65"
          rx="8"
          fill="var(--color-bg-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <rect
          x="32"
          y="36"
          width="56"
          height="6"
          rx="3"
          fill="var(--color-border-accent)"
          opacity="0.6"
        />
        <rect x="32" y="48" width="40" height="4" rx="2" fill="var(--color-border)" opacity="0.8" />
        <rect x="32" y="58" width="48" height="4" rx="2" fill="var(--color-border)" opacity="0.5" />
        <circle
          cx="95"
          cy="22"
          r="14"
          fill="var(--color-primary-muted)"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
        />
        <path
          d="M89 22l4 4 7-7"
          stroke="var(--color-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className={styles.emptyText}>No exams scheduled yet</p>
      <button className={styles.emptyAction} onClick={onAdd}>
        Add exam date
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown card for a single exam
// ---------------------------------------------------------------------------

interface ExamCountdownCardProps {
  countdown: CountdownData;
  isPrimary: boolean;
}

function ExamCountdownCard({ countdown, isPrimary }: ExamCountdownCardProps) {
  const { examDate, daysRemaining, hoursRemaining, minutesRemaining, isUrgent, isPast, isToday } =
    countdown;

  return (
    <motion.div
      className={styles.countdownCard}
      data-urgent={isUrgent && !isPast}
      data-past={isPast}
      data-primary={isPrimary}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      layout
    >
      {/* Card header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <div className={styles.subjectBadge}>
            {isPast ? (
              <CheckCircle2 size={14} aria-hidden />
            ) : isToday ? (
              <Trophy size={14} aria-hidden />
            ) : isUrgent ? (
              <AlertTriangle size={14} aria-hidden />
            ) : (
              <CalendarClock size={14} aria-hidden />
            )}
            <span>{examDate.subject}</span>
          </div>
          {isPrimary && (
            <Badge variant="primary" dot>
              Primary
            </Badge>
          )}
        </div>
        <h3 className={styles.examTitle}>{examDate.title}</h3>
        {examDate.venue && <p className={styles.venue}>{examDate.venue}</p>}
      </div>

      {/* Digit display */}
      {isPast ? (
        <div className={styles.pastBanner}>
          <CheckCircle2 size={18} />
          <span>Exam has passed</span>
        </div>
      ) : isToday ? (
        <div className={styles.todayBanner}>
          <Trophy size={18} />
          <span>Today is the day!</span>
        </div>
      ) : (
        <div
          className={styles.digitRow}
          role="timer"
          aria-label={`${daysRemaining} days, ${hoursRemaining} hours, ${minutesRemaining} minutes remaining`}
        >
          <DigitDisplay value={daysRemaining} label="days" isUrgent={isUrgent} />
          <span className={styles.digitSeparator} aria-hidden>
            :
          </span>
          <DigitDisplay value={hoursRemaining} label="hrs" isUrgent={isUrgent} />
          <span className={styles.digitSeparator} aria-hidden>
            :
          </span>
          <DigitDisplay value={minutesRemaining} label="min" isUrgent={isUrgent} />
        </div>
      )}

      {/* Urgency strip */}
      {isUrgent && !isPast && !isToday && (
        <motion.div
          className={styles.urgencyStrip}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface ExamCountdownProps {
  exams: ExamDate[];
  isLoading?: boolean;
  onAddExam?: () => void;
}

export function ExamCountdown({ exams, isLoading = false, onAddExam }: ExamCountdownProps) {
  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <Skeleton style={{ width: 120, height: 20, borderRadius: 'var(--radius-sm)' }} />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton
              style={{
                width: '60%',
                height: 14,
                borderRadius: 'var(--radius-sm)',
                marginBottom: 8,
              }}
            />
            <Skeleton
              style={{
                width: '80%',
                height: 20,
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
              }}
            />
            <div className={styles.skeletonDigits}>
              {[0, 1, 2].map((j) => (
                <Skeleton
                  key={j}
                  style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Sort: upcoming first, then by proximity
  const sortedExams = [...exams]
    .map((e) => ({ exam: e, countdown: computeCountdown(e) }))
    .sort((a, b) => {
      if (a.countdown.isPast && !b.countdown.isPast) return 1;
      if (!a.countdown.isPast && b.countdown.isPast) return -1;
      if (a.exam.isPrimary && !b.exam.isPrimary) return -1;
      if (!a.exam.isPrimary && b.exam.isPrimary) return 1;
      return a.countdown.daysRemaining - b.countdown.daysRemaining;
    });

  return (
    <section className={styles.root} aria-label="Exam Countdown">
      <div className={styles.header}>
        <CalendarClock size={16} aria-hidden />
        <h2 className={styles.sectionTitle}>Upcoming Exams</h2>
        {onAddExam && (
          <button className={styles.addBtn} onClick={onAddExam} aria-label="Add exam date">
            + Add exam
          </button>
        )}
      </div>

      {sortedExams.length === 0 ? (
        <NoExamState onAdd={onAddExam ?? (() => {})} />
      ) : (
        <div className={styles.cardList}>
          <AnimatePresence mode="popLayout">
            {sortedExams.map(({ exam, countdown }) => (
              <ExamCountdownCard key={exam.id} countdown={countdown} isPrimary={exam.isPrimary} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
