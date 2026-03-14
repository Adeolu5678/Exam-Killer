// =============================================================================
// features/study-plan/model/studyPlanStore.ts
// Layer: features → study-plan → model
// Rule: Zustand is for EPHEMERAL UI state only. Never store server data here.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { CalendarView } from './types';
import { formatDateStr } from './types';

interface StudyPlanState {
  // Calendar navigation
  calendarView: CalendarView;
  viewYear: number;
  viewMonth: number; // 0-indexed (0 = January)
  selectedDate: string | null; // 'YYYY-MM-DD' or null

  // Session interaction
  activeSessionId: string | null;
  isSessionCreatorOpen: boolean;
  isExamCreatorOpen: boolean;

  // Anchor for week view
  weekAnchorDate: string; // 'YYYY-MM-DD'
}

interface StudyPlanActions {
  setCalendarView: (view: CalendarView) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  navigateWeek: (direction: 'prev' | 'next') => void;
  selectDate: (date: string | null) => void;
  setActiveSession: (sessionId: string | null) => void;
  openSessionCreator: () => void;
  closeSessionCreator: () => void;
  openExamCreator: () => void;
  closeExamCreator: () => void;
  goToToday: () => void;
}

const today = new Date();

export const useStudyPlanStore = create<StudyPlanState & StudyPlanActions>()(
  immer((set) => ({
    // Initial state
    calendarView: 'week',
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth(),
    selectedDate: null,
    activeSessionId: null,
    isSessionCreatorOpen: false,
    isExamCreatorOpen: false,
    weekAnchorDate: formatDateStr(today),

    // Actions
    setCalendarView: (view) =>
      set((state) => {
        state.calendarView = view;
      }),

    navigateMonth: (direction) =>
      set((state) => {
        if (direction === 'prev') {
          if (state.viewMonth === 0) {
            state.viewMonth = 11;
            state.viewYear -= 1;
          } else {
            state.viewMonth -= 1;
          }
        } else {
          if (state.viewMonth === 11) {
            state.viewMonth = 0;
            state.viewYear += 1;
          } else {
            state.viewMonth += 1;
          }
        }
      }),

    navigateWeek: (direction) =>
      set((state) => {
        const anchor = new Date(`${state.weekAnchorDate}T00:00:00`);
        const delta = direction === 'prev' ? -7 : 7;
        anchor.setDate(anchor.getDate() + delta);
        state.weekAnchorDate = formatDateStr(anchor);
      }),

    selectDate: (date) =>
      set((state) => {
        state.selectedDate = date;
      }),

    setActiveSession: (sessionId) =>
      set((state) => {
        state.activeSessionId = sessionId;
      }),

    openSessionCreator: () =>
      set((state) => {
        state.isSessionCreatorOpen = true;
      }),

    closeSessionCreator: () =>
      set((state) => {
        state.isSessionCreatorOpen = false;
      }),

    openExamCreator: () =>
      set((state) => {
        state.isExamCreatorOpen = true;
      }),

    closeExamCreator: () =>
      set((state) => {
        state.isExamCreatorOpen = false;
      }),

    goToToday: () => {
      const now = new Date();
      set((state) => {
        state.viewYear = now.getFullYear();
        state.viewMonth = now.getMonth();
        state.weekAnchorDate = formatDateStr(now);
        state.selectedDate = formatDateStr(now);
      });
    },
  })),
);
