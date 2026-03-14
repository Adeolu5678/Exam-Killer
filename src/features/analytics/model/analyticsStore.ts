// =============================================================================
// features/analytics/model/analyticsStore.ts
// Layer: features → analytics → model
// Zustand (immer) store for ephemeral UI state only.
// Server data lives in TanStack Query cache.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ChartRange = 7 | 14 | 30;

interface AnalyticsState {
  // Chart time-range selector
  chartRange: ChartRange;

  // Actions
  setChartRange: (range: ChartRange) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  immer((set) => ({
    chartRange: 30,

    setChartRange: (range) =>
      set((state) => {
        state.chartRange = range;
      }),
  })),
);
