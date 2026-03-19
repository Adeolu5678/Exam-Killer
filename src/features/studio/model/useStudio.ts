'use client';

import { useCallback, useEffect } from 'react';

import { toast } from 'sonner';

import { useStudioStore } from './studioStore';
import type { StudioJobType } from './types';
import { triggerStudioJob, getJobStatus } from '../api/studioApi';

export function useStudio(workspaceId: string, notebookId: string | null) {
  const jobs = useStudioStore((state) => state.jobs);
  const startJob = useStudioStore((state) => state.startJob);
  const updateJob = useStudioStore((state) => state.updateJob);
  const setPollingInterval = useStudioStore((state) => state.setPollingInterval);
  const pollingIntervals = useStudioStore((state) => state.pollingIntervals);

  const stopPolling = useCallback(
    (jobType: StudioJobType) => {
      const intervalId = pollingIntervals[jobType];
      if (intervalId) {
        clearInterval(intervalId);
        setPollingInterval(jobType, undefined);
      }
    },
    [pollingIntervals, setPollingInterval],
  );

  const pollJobStatus = useCallback(
    async (jobType: StudioJobType, jobId: string) => {
      try {
        const statusResponse = await getJobStatus(jobId);

        updateJob(jobType, {
          status: statusResponse.status as any,
          result_url: statusResponse.result_url,
          error_message: statusResponse.error_message,
        });

        if (statusResponse.status === 'done' || statusResponse.status === 'error') {
          stopPolling(jobType);
          if (statusResponse.status === 'done') {
            toast.success(
              `${jobType.charAt(0).toUpperCase() + jobType.slice(1)} generation complete!`,
            );
          } else {
            toast.error(`${jobType.charAt(0).toUpperCase() + jobType.slice(1)} generation failed.`);
          }
        }
      } catch (error) {
        console.error(`[StudioPolling] Error polling ${jobType}:`, error);
        // Don't stop polling on a single network error, wait for retry
      }
    },
    [updateJob, stopPolling],
  );

  const triggerJob = useCallback(
    async (jobType: StudioJobType) => {
      if (!notebookId) {
        toast.error('Notebook ID not found. Please ensure your workspace is connected.');
        return;
      }

      try {
        updateJob(jobType, { status: 'pending', error_message: null });
        const { job_id } = await triggerStudioJob(notebookId, workspaceId, jobType);

        startJob(jobType, job_id);

        const intervalId = window.setInterval(() => {
          pollJobStatus(jobType, job_id);
        }, 15000); // Poll every 15 seconds

        setPollingInterval(jobType, intervalId as unknown as number);
        toast.info(`Generating ${jobType}... This may take a few minutes.`);
      } catch (error: any) {
        console.error(`[StudioTrigger] Error triggering ${jobType}:`, error);
        updateJob(jobType, {
          status: 'error',
          error_message: error.message || 'Failed to start generation',
        });
        toast.error(`Failed to start ${jobType} generation.`);
      }
    },
    [notebookId, workspaceId, startJob, updateJob, pollJobStatus, setPollingInterval],
  );

  // Cleanup pulls on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals).forEach((id) => {
        if (id) clearInterval(id);
      });
    };
  }, [pollingIntervals]);

  return {
    jobs,
    triggerJob,
  };
}
