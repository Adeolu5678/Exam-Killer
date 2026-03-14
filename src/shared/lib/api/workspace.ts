import type {
  CreateWorkspaceRequest,
  WorkspacesResponse,
  WorkspaceListItem,
  UpdateWorkspaceRequest,
  WorkspaceDetail,
} from '@/shared/types/api';

const API_BASE = '/api/workspaces';

export async function fetchWorkspaces(
  page: number = 1,
  limit: number = 10,
  search?: string,
): Promise<{ workspaces: WorkspaceListItem[]; pagination: WorkspacesResponse['pagination'] }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    params.set('search', search);
  }

  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workspaces' }));
    throw new Error(error.error || 'Failed to fetch workspaces');
  }

  const data: WorkspacesResponse = await response.json();
  return {
    workspaces: data.workspaces,
    pagination: data.pagination,
  };
}

export async function createWorkspace(
  data: CreateWorkspaceRequest,
): Promise<{ id: string; name: string; description: string }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create workspace' }));
    throw new Error(error.error || 'Failed to create workspace');
  }

  const result = await response.json();
  return result.workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceRequest,
): Promise<WorkspaceDetail> {
  const response = await fetch(`${API_BASE}/${workspaceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update workspace' }));
    throw new Error(error.error || 'Failed to update workspace');
  }

  const result = await response.json();
  return result.workspace;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${workspaceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete workspace' }));
    throw new Error(error.error || 'Failed to delete workspace');
  }
}
