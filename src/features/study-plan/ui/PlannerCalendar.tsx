'use client';

// =============================================================================
// features/study-plan/ui/PlannerCalendar.tsx
// Layer: features → study-plan → ui
// FSD: imports only from @/shared/ui and local model
// =============================================================================

import React, { useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Plus, Clock } from 'lucide-react';

import { Badge, Skeleton } from '@/shared/ui';

import styles from './PlannerCalendar.module.css';
import { useStudyPlanStore } from '../model/studyPlanStore';
import {
  buildMonthGrid,
  buildWeekGrid,
  SESSION_CATEGORY_CONFIG,
  formatTime,
  formatDuration,
  formatDateStr,
} from '../model/types';
import type { StudySession, CalendarDay } from '../model/types';

// ---------------------------------------------------------------------------
// Day abbreviations
// ---------------------------------------------------------------------------
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ---------------------------------------------------------------------------
// Session Pill — compact session indicator on calendar cell
// ---------------------------------------------------------------------------

interface SessionPillProps {
  session: StudySession;
  onClick: () => void;
}

function SessionPill({ session, onClick }: SessionPillProps) {
  const config = SESSION_CATEGORY_CONFIG[session.category];
  const isCompleted = session.status === 'completed';
  const isSkipped = session.status === 'skipped';

  return (
    <button
      className={styles.sessionPill}
      onClick={onClick}
      data-status={session.status}
      aria-label={`${session.title} at ${formatTime(session.startTime)}`}
      style={
        {
          '--pill-color': config.color,
          '--pill-bg': config.bgColor,
        } as React.CSSProperties
      }
    >
      <span className={styles.pillDot} aria-hidden />
      <span className={styles.pillText}>{session.title}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Calendar Cell
// ---------------------------------------------------------------------------

interface CalendarCellProps {
  day: CalendarDay;
  onSelectDate: (date: string) => void;
  onAddSession: (date: string) => void;
  onSelectSession: (sessionId: string) => void;
}

function CalendarCell({ day, onSelectDate, onAddSession, onSelectSession }: CalendarCellProps) {
  const maxVisible = 3;
  const overflow = day.sessions.length - maxVisible;

  return (
    <div
      className={styles.calendarCell}
      data-today={day.isToday}
      data-other-month={!day.isCurrentMonth}
      onClick={() => onSelectDate(day.dateStr)}
      role="button"
      tabIndex={0}
      aria-label={`${day.date.toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}${day.sessions.length > 0 ? `, ${day.sessions.length} sessions` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectDate(day.dateStr);
        }
      }}
    >
      <div className={styles.cellHeader}>
        <span className={styles.cellDate}>{day.date.getDate()}</span>
        {day.isToday && <span className={styles.todayDot} aria-hidden />}
        <button
          className={styles.cellAddBtn}
          onClick={(e) => {
            e.stopPropagation();
            onAddSession(day.dateStr);
          }}
          aria-label={`Add session on ${day.dateStr}`}
          tabIndex={-1}
        >
          <Plus size={10} />
        </button>
      </div>

      <div className={styles.cellSessions}>
        {day.sessions.slice(0, maxVisible).map((session) => (
          <SessionPill
            key={session.id}
            session={session}
            onClick={(e?: React.MouseEvent) => {
              e?.stopPropagation();
              onSelectSession(session.id);
            }}
          />
        ))}
        {overflow > 0 && <span className={styles.overflowBadge}>+{overflow} more</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week view row
// ---------------------------------------------------------------------------

interface WeekRowProps {
  days: CalendarDay[];
  onSelectDate: (date: string) => void;
  onAddSession: (date: string) => void;
  onSelectSession: (sessionId: string) => void;
}

function WeekRow({ days, onSelectDate, onAddSession, onSelectSession }: WeekRowProps) {
  return (
    <div className={styles.weekRow}>
      {/* Time ruler — left gutter for week view */}
      <div className={styles.weekTimeRuler}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className={styles.weekTimeSlot}>
            <span className={styles.weekTimeLabel}>
              {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      {days.map((day) => (
        <div key={day.dateStr} className={styles.weekDayColumn} data-today={day.isToday}>
          {/* Column header */}
          <div className={styles.weekDayHeader}>
            <span className={styles.weekDayName}>{DAY_ABBR[day.date.getDay()]}</span>
            <button
              className={styles.weekDayNum}
              data-today={day.isToday}
              onClick={() => onSelectDate(day.dateStr)}
              aria-label={day.date.toLocaleDateString('en-NG', { month: 'long', day: 'numeric' })}
            >
              {day.date.getDate()}
            </button>
          </div>

          {/* Sessions */}
          <div className={styles.weekDaySessions}>
            {day.sessions.length === 0 ? (
              <button
                className={styles.weekAddPlaceholder}
                onClick={() => onAddSession(day.dateStr)}
                aria-label={`Add session on ${day.dateStr}`}
              >
                <Plus size={12} />
              </button>
            ) : (
              day.sessions.map((session) => {
                const config = SESSION_CATEGORY_CONFIG[session.category];
                return (
                  <button
                    key={session.id}
                    className={styles.weekSessionBlock}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSession(session.id);
                    }}
                    data-status={session.status}
                    style={
                      {
                        '--block-color': config.color,
                        '--block-bg': config.bgColor,
                      } as React.CSSProperties
                    }
                    aria-label={`${session.title}, ${formatTime(session.startTime)} – ${formatTime(session.endTime)}`}
                  >
                    <span className={styles.weekBlockTitle}>{session.title}</span>
                    <span className={styles.weekBlockTime}>
                      <Clock size={10} aria-hidden />
                      {formatDuration(session.durationMinutes)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public Component
// ---------------------------------------------------------------------------

interface PlannerCalendarProps {
  sessions: StudySession[];
  isLoading?: boolean;
  onAddSession?: (date?: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

export function PlannerCalendar({
  sessions,
  isLoading = false,
  onAddSession,
  onSelectSession,
}: PlannerCalendarProps) {
  const {
    calendarView,
    viewYear,
    viewMonth,
    weekAnchorDate,
    selectedDate,
    setCalendarView,
    navigateMonth,
    navigateWeek,
    selectDate,
    goToToday,
  } = useStudyPlanStore();

  // Build grid data
  const monthGrid = useMemo(
    () => (calendarView === 'month' ? buildMonthGrid(viewYear, viewMonth, sessions) : []),
    [calendarView, viewYear, viewMonth, sessions],
  );

  const weekDays = useMemo(
    () =>
      calendarView === 'week'
        ? buildWeekGrid(new Date(`${weekAnchorDate}T00:00:00`), sessions)
        : [],
    [calendarView, weekAnchorDate, sessions],
  );

  const handleAddSession = (date?: string) => {
    if (date) selectDate(date);
    onAddSession?.(date);
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession?.(sessionId);
  };

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.toolbar}>
          <Skeleton style={{ width: 160, height: 28, borderRadius: 'var(--radius-sm)' }} />
          <Skeleton style={{ width: 120, height: 32, borderRadius: 'var(--radius-md)' }} />
        </div>
        <div className={styles.dayHeaderRow}>
          {DAY_ABBR.map((d) => (
            <Skeleton key={d} style={{ height: 16, borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={styles.monthGridRow}>
            {Array.from({ length: 7 }, (_, j) => (
              <Skeleton key={j} style={{ height: 96, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className={styles.root} aria-label="Study Planner Calendar">
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Navigation */}
        <div className={styles.navGroup}>
          <button
            className={styles.navBtn}
            onClick={() =>
              calendarView === 'month' ? navigateMonth('prev') : navigateWeek('prev')
            }
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className={styles.currentPeriod}>
            {calendarView === 'month'
              ? `${MONTH_NAMES[viewMonth]} ${viewYear}`
              : (() => {
                  const start = weekDays[0]?.date;
                  const end = weekDays[6]?.date;
                  if (!start || !end) return '';
                  const same = start.getMonth() === end.getMonth();
                  if (same) {
                    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
                  }
                  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
                })()}
          </h2>
          <button
            className={styles.navBtn}
            onClick={() =>
              calendarView === 'month' ? navigateMonth('next') : navigateWeek('next')
            }
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.toolbarActions}>
          {/* Today button */}
          <button className={styles.todayBtn} onClick={goToToday}>
            Today
          </button>

          {/* View toggle */}
          <div className={styles.viewToggle} role="group" aria-label="Calendar view">
            <button
              className={styles.viewToggleBtn}
              data-active={calendarView === 'week'}
              onClick={() => setCalendarView('week')}
              aria-pressed={calendarView === 'week'}
            >
              <CalendarDays size={14} />
              Week
            </button>
            <button
              className={styles.viewToggleBtn}
              data-active={calendarView === 'month'}
              onClick={() => setCalendarView('month')}
              aria-pressed={calendarView === 'month'}
            >
              <LayoutGrid size={14} />
              Month
            </button>
          </div>

          {/* Add session */}
          <button
            className={styles.addSessionBtn}
            onClick={() => handleAddSession(selectedDate ?? undefined)}
            aria-label="Add study session"
          >
            <Plus size={14} />
            Add session
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <AnimatePresence mode="wait">
        {calendarView === 'month' ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={styles.monthGrid}
          >
            {/* Day header */}
            <div className={styles.dayHeaderRow}>
              {DAY_ABBR.map((d) => (
                <div key={d} className={styles.dayHeader}>
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {monthGrid.map((week, wi) => (
              <div key={wi} className={styles.monthGridRow}>
                {week.map((day) => (
                  <CalendarCell
                    key={day.dateStr}
                    day={day}
                    onSelectDate={selectDate}
                    onAddSession={handleAddSession}
                    onSelectSession={handleSelectSession}
                  />
                ))}
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="week"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <WeekRow
              days={weekDays}
              onSelectDate={selectDate}
              onAddSession={handleAddSession}
              onSelectSession={handleSelectSession}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
