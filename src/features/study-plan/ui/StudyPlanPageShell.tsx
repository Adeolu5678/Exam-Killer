'use client';

// =============================================================================
// features/study-plan/ui/StudyPlanPageShell.tsx
// Layer: features → study-plan → ui
// FSD: imports ONLY from @/shared/ui and @/features/workspace (public APIs)
// =============================================================================

import React, { useMemo, useState } from 'react';

import { motion } from 'framer-motion';
import { CalendarCheck2, BookOpen, CheckCircle2, Timer, PlusCircle, Sparkles } from 'lucide-react';

import { Badge, Card, CardContent, Input } from '@/shared/ui';

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
  type GenerateStudyPlanPayload,
} from '../model/types';
import {
  useStudySessions,
  useStudyPlans,
  useExamDates,
  useCompleteStudySession,
  useGenerateStudyPlan,
  useUpdateGeneratedStudyPlan,
  useCompleteStudyPlanItem,
} from '../model/useStudyPlan';

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

interface GeneratedStudyPlansPanelProps {
  workspaceId: string;
  defaultExamDate?: string;
}

function GeneratedStudyPlansPanel({ workspaceId, defaultExamDate }: GeneratedStudyPlansPanelProps) {
  const { data: plans = [], isLoading } = useStudyPlans(workspaceId);
  const generatePlan = useGenerateStudyPlan(workspaceId);
  const updatePlan = useUpdateGeneratedStudyPlan(workspaceId);
  const completePlanItem = useCompleteStudyPlanItem(workspaceId);
  const [form, setForm] = useState({
    title: '',
    examDate: defaultExamDate ?? '',
    dailyStudyHours: '2',
    focusTopics: '',
  });

  function parseTopics(raw: string): string[] {
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 24);
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const examDate = form.examDate || defaultExamDate || '';
    const payload: GenerateStudyPlanPayload = {
      title: form.title.trim() || undefined,
      examDate,
      dailyStudyHours: Number(form.dailyStudyHours),
      focusTopics: parseTopics(form.focusTopics),
    };

    generatePlan.mutate(payload, {
      onSuccess: () => {
        setForm((prev) => ({ ...prev, title: '', focusTopics: '' }));
      },
    });
  }

  return (
    <Card className={styles.generatedPlansCard}>
      <CardContent className={styles.generatedPlansContent}>
        <div className={styles.generatedPlansHeader}>
          <div className={styles.generatedPlansTitleWrap}>
            <div className={styles.generatedPlansIcon} aria-hidden>
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className={styles.generatedPlansTitle}>AI Study Plans</h2>
              <p className={styles.generatedPlansSubtitle}>
                Generate and edit adaptive plans based on your exam timeline.
              </p>
            </div>
          </div>
        </div>

        <form className={styles.generatedPlanForm} onSubmit={handleGenerate}>
          <div className={styles.generatedPlanFormGrid}>
            <Input
              label="Plan title (optional)"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="e.g. Midterm Sprint Plan"
            />
              <Input
                label="Exam date"
                type="date"
                value={form.examDate || defaultExamDate || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, examDate: event.target.value }))}
                required
              />
            <Input
              label="Daily study hours"
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={form.dailyStudyHours}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dailyStudyHours: event.target.value }))
              }
              required
            />
          </div>
          <Input
            label="Focus topics (comma-separated)"
            value={form.focusTopics}
            onChange={(event) => setForm((prev) => ({ ...prev, focusTopics: event.target.value }))}
            placeholder="Derivatives, Thermodynamics, Organic chemistry"
          />
            <button
              type="submit"
              className={styles.actionBtnPrimary}
              disabled={generatePlan.isPending || !(form.examDate || defaultExamDate)}
            >
            <Sparkles size={14} />
            {generatePlan.isPending ? 'Generating...' : 'Generate plan'}
          </button>
        </form>

        {isLoading ? (
          <p className={styles.generatedPlansHint}>Loading generated plans...</p>
        ) : plans.length === 0 ? (
          <p className={styles.generatedPlansHint}>
            No generated plans yet. Create one to start guided daily study tasks.
          </p>
        ) : (
          <div className={styles.generatedPlanList}>
            {plans.map((plan) => (
              <article key={plan.id} className={styles.generatedPlanItem}>
                <header className={styles.generatedPlanItemHeader}>
                  <div>
                    <h3 className={styles.generatedPlanItemTitle}>{plan.title}</h3>
                    <p className={styles.generatedPlanItemMeta}>
                      Exam: {plan.examDate} · {plan.dailyStudyHours}h/day
                    </p>
                  </div>
                  <div className={styles.generatedPlanActions}>
                    <Badge>{plan.progress}% complete</Badge>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() =>
                        updatePlan.mutate({
                          planId: plan.id,
                          payload: { status: plan.status === 'active' ? 'paused' : 'active' },
                        })
                      }
                      disabled={updatePlan.isPending}
                    >
                      {plan.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </header>
                <ul className={styles.generatedPlanSchedule}>
                  {plan.generatedSchedule.map((item, index) => (
                    <li key={`${plan.id}-${item.date}-${index}`} className={styles.generatedPlanScheduleItem}>
                      <label className={styles.generatedPlanScheduleLabel}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(event) =>
                            completePlanItem.mutate({
                              planId: plan.id,
                              itemIndex: index,
                              completed: event.target.checked,
                            })
                          }
                          disabled={completePlanItem.isPending}
                        />
                        <span>
                          {item.date} · {item.topic} · {Math.round(item.duration_minutes)}m
                        </span>
                      </label>
                      <Badge>{item.activity_type}</Badge>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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

    const nearestUpcomingExamDate = useMemo(() => {
      const upcoming = exams
        .filter((exam) => !computeCountdown(exam).isPast)
        .sort((a, b) => a.examDate.localeCompare(b.examDate));
      return upcoming[0]?.examDate;
    }, [exams]);

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

        <GeneratedStudyPlansPanel
          workspaceId={workspaceId}
          defaultExamDate={nearestUpcomingExamDate}
        />

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
