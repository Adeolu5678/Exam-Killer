// =============================================================================
// features/studio/api/studioApi.ts
// Layer: features → studio → api
// =============================================================================

import type { StudioJobType } from '../model/types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export interface StudioJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result_url: string | null;
  error_message: string | null;
  job_type: StudioJobType;
}

/**
 * Triggers a new long-running studio job.
 */
export async function triggerStudioJob(
  notebookId: string,
  workspaceId: string,
  jobType: StudioJobType,
): Promise<{ job_id: string }> {
  return apiFetch<{ job_id: string }>(`/api/notebooklm/notebooks/${notebookId}/jobs`, {
    method: 'POST',
    body: JSON.stringify({ workspaceId, jobType }),
  });
}

/**
 * Fetches the status of a specific job.
 */
export async function getJobStatus(jobId: string): Promise<StudioJobResponse> {
  return apiFetch<StudioJobResponse>(`/api/notebooklm/jobs/${jobId}`);
}
