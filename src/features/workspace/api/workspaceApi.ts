// =============================================================================
// features/workspace/api/workspaceApi.ts
// Layer: features → workspace → api
// Contract: All fetch functions call Next.js API routes.
//           No business logic lives here — only network I/O + error normalisation.
// =============================================================================

import type {
  WorkspacesQuery,
  WorkspacesResponse,
  WorkspaceDetailResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  UpdateWorkspaceRequest,
  UpdateWorkspaceResponse,
  DeleteWorkspaceResponse,
  WorkspaceMembersResponse,
  InviteMemberRequest,
  InviteMemberResponse,
} from '@/shared/types/api';

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const message =
      typeof body['error'] === 'string' ? body['error'] : `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Workspace CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of the authenticated user's workspaces.
 */
export async function fetchWorkspaces(query: WorkspacesQuery = {}): Promise<WorkspacesResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.is_public !== undefined) params.set('is_public', String(query.is_public));
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<WorkspacesResponse>(`/api/workspaces${qs}`);
}

/**
 * Fetch a single workspace with full detail (sources, flashcard stats, etc.)
 */
export async function fetchWorkspace(id: string): Promise<WorkspaceDetailResponse> {
  return apiFetch<WorkspaceDetailResponse>(`/api/workspaces/${id}`);
}

/**
 * Create a new workspace.
 */
export async function createWorkspace(
  payload: CreateWorkspaceRequest,
): Promise<CreateWorkspaceResponse> {
  return apiFetch<CreateWorkspaceResponse>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Patch a workspace's metadata.
 */
export async function updateWorkspace(
  id: string,
  payload: UpdateWorkspaceRequest,
): Promise<UpdateWorkspaceResponse> {
  return apiFetch<UpdateWorkspaceResponse>(`/api/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Permanently delete a workspace.
 */
export async function deleteWorkspace(id: string): Promise<DeleteWorkspaceResponse> {
  return apiFetch<DeleteWorkspaceResponse>(`/api/workspaces/${id}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/**
 * List all members in a workspace.
 */
export async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMembersResponse> {
  return apiFetch<WorkspaceMembersResponse>(`/api/workspaces/${workspaceId}/members`);
}

/**
 * Invite a new member by email.
 */
export async function inviteMember(
  workspaceId: string,
  payload: InviteMemberRequest,
): Promise<InviteMemberResponse> {
  return apiFetch<InviteMemberResponse>(`/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Create a NotebookLM notebook for a workspace.
 * This is a secondary action after workspace creation.
 */
export async function createNlmNotebook(
  workspaceId: string,
  title: string,
): Promise<{ notebook_id: string }> {
  return apiFetch<{ notebook_id: string }>('/api/notebooklm/notebooks', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, title }),
  });
}
