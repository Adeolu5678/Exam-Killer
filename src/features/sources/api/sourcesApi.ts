'use client';

import type { SourceItem, UploadProgress } from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

interface ApiError {
  message: string;
  status: number;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok || !body.success || body.data === undefined) {
    const message = body.error?.message || `Request failed: ${res.status}`;
    const err: ApiError = { message, status: res.status };
    throw err;
  }

  return body.data;
}

export interface SourcesListResponse {
  sources: SourceItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages?: number;
  };
}

export interface UploadSourceResponse {
  source: SourceItem;
  job?: {
    id: string;
    deduped: boolean;
    status: 'queued';
  };
}

export interface DeleteSourceResponse {
  deleted: boolean;
}

export interface ProcessSourceResponse {
  status: 'queued' | 'completed' | 'failed';
  source_id: string;
  job_id?: string;
  deduped?: boolean;
}

export async function fetchSources(
  workspaceId: string,
  page = 1,
  limit = 50,
): Promise<SourcesListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const data = await apiFetch<{ sources: SourceItem[]; total: number }>(
    `/api/v1/workspaces/${workspaceId}/sources?${params.toString()}`,
    {
      method: 'GET',
      credentials: 'include',
    },
  );

  return {
    sources: data.sources,
    pagination: {
      total: data.total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(data.total / limit)),
    },
  };
}

export function uploadSource(
  workspaceId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<SourceItem> {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  return new Promise<SourceItem>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      let payload: ApiEnvelope<UploadSourceResponse> | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as ApiEnvelope<UploadSourceResponse>;
      } catch {
        reject(new Error('Failed to parse upload response'));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.success && payload.data?.source) {
        resolve(payload.data.source);
        return;
      }

      const friendlyMessage =
        xhr.status === 413
          ? 'File is too large (max 50 MB)'
          : xhr.status === 415
            ? 'File type not supported'
            : payload.error?.message || 'Upload failed';

      reject(new Error(friendlyMessage));
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `/api/v1/workspaces/${workspaceId}/sources`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function deleteSource(sourceId: string): Promise<void> {
  const data = await apiFetch<DeleteSourceResponse>(`/api/v1/sources/${sourceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!data.deleted) {
    throw new Error('Failed to delete source');
  }
}

export async function processSource(sourceId: string): Promise<ProcessSourceResponse> {
  return apiFetch<ProcessSourceResponse>(`/api/v1/sources/${sourceId}/process`, {
    method: 'POST',
    credentials: 'include',
  });
}
