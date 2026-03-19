import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { StudioJob, StudioJobType } from './types';

interface StudioState {
  jobs: Record<StudioJobType, StudioJob>;
  pollingIntervals: Partial<Record<StudioJobType, number>>;

  // Actions
  startJob: (jobType: StudioJobType, jobId: string) => void;
  updateJob: (jobType: StudioJobType, update: Partial<StudioJob>) => void;
  setPollingInterval: (jobType: StudioJobType, intervalId: number | undefined) => void;
}

const initialJob = (type: StudioJobType): StudioJob => ({
  job_id: '',
  job_type: type,
  status: 'idle',
  result_url: null,
  error_message: null,
});

export const useStudioStore = create<StudioState>()(
  immer((set) => ({
    jobs: {
      audio: initialJob('audio'),
      video: initialJob('video'),
      infographic: initialJob('infographic'),
    },
    pollingIntervals: {},

    startJob: (jobType, jobId) =>
      set((state) => {
        state.jobs[jobType].job_id = jobId;
        state.jobs[jobType].status = 'pending';
        state.jobs[jobType].error_message = null;
        state.jobs[jobType].result_url = null;
      }),

    updateJob: (jobType, update) =>
      set((state) => {
        state.jobs[jobType] = { ...state.jobs[jobType], ...update };
      }),

    setPollingInterval: (jobType, intervalId) =>
      set((state) => {
        if (intervalId === undefined) {
          delete state.pollingIntervals[jobType];
        } else {
          state.pollingIntervals[jobType] = intervalId;
        }
      }),
  })),
);
