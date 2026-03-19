// =============================================================================
// features/sources/api/sourcesApi.ts
// Layer: features → sources → api
// Purpose: Typed fetch wrappers for workspace sources endpoints.
//          Wraps GET/POST/DELETE /api/workspaces/[id]/sources and
//          /api/sources/[sourceId] routes.
//          Consumers use the model hooks, not this file directly.
// =============================================================================

import type { SourceItem, UploadProgress } from '../model/types';

// ---------------------------------------------------------------------------
// Internal fetch helper (mirrors tutorApi / workspaceApi pattern)
// ---------------------------------------------------------------------------

interface ApiError {
  message: string;
  status: number;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore json parse errors
    }
    const err: ApiError = { message, status: res.status };
    throw err;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Response shapes (scoped to this feature; do NOT import from @/types/api)
// ---------------------------------------------------------------------------

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
  upload_url?: string;
}

export interface DeleteSourceResponse {
  success: boolean;
}

export interface ProcessSourceResponse {
  success: boolean;
  sourceId: string;
  chunkCount: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated list of sources for a workspace.
 */
export async function fetchSources(
  workspaceId: string,
  page = 1,
  limit = 50,
): Promise<SourcesListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<SourcesListResponse>(
    `/api/workspaces/${workspaceId}/sources?${params.toString()}`,
    { method: 'GET', credentials: 'include' as RequestCredentials },
  );
}

/**
 * Uploads a file to the workspace sources endpoint.
 * Uses XHR so we can track upload progress via onProgress callback.
 * Resolves with the created SourceItem.
 */
export function uploadSource(
  workspaceId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<SourceItem> {
  const formData = new FormData();
  formData.append('file', file);

  const fileType =
    file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'text';
  formData.append('type', fileType);

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
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as UploadSourceResponse;
          resolve(data.source);
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(error.error ?? 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `/api/workspaces/${workspaceId}/sources`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

/**
 * Deletes a source by its ID.
 */
export async function deleteSource(sourceId: string): Promise<void> {
  const data = await apiFetch<DeleteSourceResponse>(`/api/sources/${sourceId}`, {
    method: 'DELETE',
    credentials: 'include' as RequestCredentials,
  });
  if (!data.success) throw new Error('Failed to delete source');
}

/**
 * Triggers (re-)processing of a source document (embedding pipeline).
 */
export async function processSource(sourceId: string): Promise<ProcessSourceResponse> {
  return apiFetch<ProcessSourceResponse>(`/api/sources/${sourceId}/process`, {
    method: 'POST',
    credentials: 'include' as RequestCredentials,
  });
}

/**
 * Fetches the NLM notebook associated with a workspace.
 */
export async function getNlmNotebook(
  workspaceId: string,
): Promise<{ notebook_id: string; profile_name: string } | null> {
  try {
    return apiFetch<{ notebook_id: string; profile_name: string }>(
      `/api/notebooklm/notebooks?workspaceId=${workspaceId}`,
      { method: 'GET', credentials: 'include' as RequestCredentials },
    );
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Pushes a source URL to an NLM notebook.
 */
export async function addSourceToNlm(
  notebookId: string,
  workspaceId: string,
  sourceUrl: string,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/notebooklm/notebooks/${notebookId}/sources`, {
    method: 'POST',
    body: JSON.stringify({
      workspaceId,
      sourceType: 'url',
      value: sourceUrl,
    }),
    credentials: 'include' as RequestCredentials,
  });
}
