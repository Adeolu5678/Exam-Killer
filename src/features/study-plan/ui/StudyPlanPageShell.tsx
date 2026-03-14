'use client';

// =============================================================================
// features/study-plan/ui/StudyPlanPageShell.tsx
// Layer: features → study-plan → ui
// FSD: imports ONLY from @/shared/ui and @/features/workspace (public APIs)
// =============================================================================

import React, { useMemo } from 'react';

import { motion } from 'framer-motion';
import { CalendarCheck2, BookOpen, CheckCircle2, Timer, PlusCircle } from 'lucide-react';

import { Badge, Card, CardContent } from '@/shared/ui';

import { useWorkspace } from '@/features/workspace';

import { ExamCountdown } from './ExamCountdown';
import { ExamCreatorModal } from './ExamCreatorModal';
import { PlannerCalendar } from './PlannerCalendar';
import { SessionCreatorModal } from './SessionCreatorModal';
import styles from './StudyPlanPageShell.module.css';
import { useStudyPlanStore } from '../model/studyPlanStore';
import {
  computeCountdown,
  computeWeekStats,
  formatDuration,
  formatTime,
  SESSION_CATEGORY_CONFIG,
  formatDateStr,
} from '../model/types';
import { useStudySessions, useExamDates, useCompleteStudySession } from '../model/useStudyPlan';

// ---------------------------------------------------------------------------
// Stat pill (mini card for weekly stats)
// ---------------------------------------------------------------------------

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: 'default' | 'primary' | 'amber' | 'emerald';
  delay?: number;
}

function StatPill({ icon, label, value, variant = 'default', delay = 0 }: StatPillProps) {
  return (
    <motion.div
      className={styles.statPill}
      data-variant={variant}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.statPillIcon}>{icon}</div>
      <div className={styles.statPillContent}>
        <span className={styles.statPillValue}>{value}</span>
        <span className={styles.statPillLabel}>{label}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Today's session list (right sidebar)
// ---------------------------------------------------------------------------

interface TodaysSessionsProps {
  workspaceId: string;
}

function TodaysSessions({ workspaceId }: TodaysSessionsProps) {
  const { data: sessions = [], isLoading } = useStudySessions(workspaceId);
  const complete = useCompleteStudySession(workspaceId);
  const today = formatDateStr(new Date());

  const todaysSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.startTime.startsWith(today))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, today],
  );

  if (isLoading) return null;

  return (
    <div className={styles.todaysSessions}>
      <p className={styles.sectionLabel}>Today&apos;s Schedule</p>
      {todaysSessions.length === 0 ? (
        <p className={styles.noSessionsText}>Nothing scheduled today &mdash; enjoy the break!</p>
      ) : (
        <ul className={styles.sessionList} role="list">
          {todaysSessions.map((session, i) => {
            const config = SESSION_CATEGORY_CONFIG[session.category];
            const isDone = session.status === 'completed';
            return (
              <motion.li
                key={session.id}
                className={styles.sessionRow}
                data-done={isDone}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
              >
                <div
                  className={styles.sessionColorBar}
                  style={{ background: config.color }}
                  aria-hidden
                />
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionName}>{session.title}</span>
                  <span className={styles.sessionTime}>
                    {formatTime(session.startTime)} · {formatDuration(session.durationMinutes)}
                  </span>
                </div>
                {!isDone && (
                  <button
                    className={styles.checkBtn}
                    onClick={() => complete.mutate(session.id)}
                    disabled={complete.isPending}
                    aria-label={`Mark "${session.title}" as complete`}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {isDone && (
                  <CheckCircle2 size={16} className={styles.doneIcon} aria-label="Completed" />
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface StudyPlanPageShellProps {
  workspaceId: string;
}

export function StudyPlanPageShell({ workspaceId }: StudyPlanPageShellProps) {
  const { data: workspaceResponse } = useWorkspace(workspaceId);
  const workspace = workspaceResponse?.workspace;
  const { data: sessions = [], isLoading: loadingSessions } = useStudySessions(workspaceId);
  const { data: exams = [], isLoading: loadingExams } = useExamDates(workspaceId);
  const { openSessionCreator, openExamCreator, setActiveSession } = useStudyPlanStore();

  const weekStats = useMemo(() => {
    const stats = computeWeekStats(sessions);
    return { ...stats, upcomingExamCount: exams.filter((e) => !computeCountdown(e).isPast).length };
  }, [sessions, exams]);

  return (
    <div className={styles.root}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerText}>
          <div className={styles.headerIcon} aria-hidden>
            <CalendarCheck2 size={20} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Study Plan</h1>
            {workspace && <p className={styles.pageSubtitle}>{workspace?.name}</p>}
          </div>
        </div>

        {/* Quick actions */}
        <div className={styles.headerActions}>
          <button className={styles.actionBtn} onClick={openExamCreator}>
            <PlusCircle size={14} />
            Add exam
          </button>
          <button className={styles.actionBtnPrimary} onClick={openSessionCreator}>
            <PlusCircle size={14} />
            Add session
          </button>
        </div>
      </div>

      {/* Weekly stats row */}
      <div className={styles.statsRow}>
        <StatPill
          icon={<BookOpen size={14} />}
          label="Sessions this week"
          value={weekStats.totalSessionsThisWeek}
          variant="primary"
          delay={0}
        />
        <StatPill
          icon={<CheckCircle2 size={14} />}
          label="Completion rate"
          value={`${weekStats.completionRate}%`}
          variant={weekStats.completionRate >= 70 ? 'emerald' : 'amber'}
          delay={0.06}
        />
        <StatPill
          icon={<Timer size={14} />}
          label="Study time"
          value={formatDuration(weekStats.totalStudyMinutesThisWeek)}
          variant="default"
          delay={0.12}
        />
        <StatPill
          icon={<CalendarCheck2 size={14} />}
          label="Upcoming exams"
          value={weekStats.upcomingExamCount}
          variant={weekStats.upcomingExamCount > 0 ? 'amber' : 'default'}
          delay={0.18}
        />
      </div>

      {/* Main two-column grid */}
      <div className={styles.mainGrid}>
        {/* Calendar — primary column */}
        <PlannerCalendar
          sessions={sessions}
          isLoading={loadingSessions}
          onAddSession={() => openSessionCreator()}
          onSelectSession={setActiveSession}
        />

        {/* Right sidebar */}
        <aside className={styles.sidebar}>
          {/* Exam Countdown */}
          <ExamCountdown exams={exams} isLoading={loadingExams} onAddExam={openExamCreator} />

          {/* Divider */}
          <div className={styles.sidebarDivider} aria-hidden />

          {/* Today's schedule */}
          <TodaysSessions workspaceId={workspaceId} />
        </aside>
      </div>

      {/* ── Creator modals ──────────────────────────────────────────────────
          Both are self-contained: they read their open-state from
          studyPlanStore and call its close action on dismiss / success.
      ─────────────────────────────────────────────────────────────────────── */}
      <SessionCreatorModal workspaceId={workspaceId} />
      <ExamCreatorModal workspaceId={workspaceId} />
    </div>
  );
}
