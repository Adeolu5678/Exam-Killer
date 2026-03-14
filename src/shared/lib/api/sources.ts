import type {
  SourceListItem,
  SourcesListResponse,
  UploadSourceResponse,
  DeleteSourceResponse,
} from '@/shared/types/api';

const API_BASE = '/api/workspaces';

export async function fetchSources(
  workspaceId: string,
  page: number = 1,
  limit: number = 10,
): Promise<{ sources: SourceListItem[]; pagination: SourcesListResponse['pagination'] }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE}/${workspaceId}/sources?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch sources' }));
    throw new Error(error.error || 'Failed to fetch sources');
  }

  const data: SourcesListResponse = await response.json();
  return {
    sources: data.sources,
    pagination: data.pagination,
  };
}

export async function uploadSource(
  workspaceId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadSourceResponse['source']> {
  const formData = new FormData();
  formData.append('file', file);

  const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
  formData.append('type', fileType);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.source);
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Failed to upload source'));
        } catch {
          reject(new Error('Failed to upload source'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Failed to upload source'));
    });

    xhr.open('POST', `${API_BASE}/${workspaceId}/sources`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export async function deleteSource(sourceId: string): Promise<void> {
  const response = await fetch(`/api/sources/${sourceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete source' }));
    throw new Error(error.error || 'Failed to delete source');
  }

  const data: DeleteSourceResponse = await response.json();
  if (!data.success) {
    throw new Error('Failed to delete source');
  }
}
