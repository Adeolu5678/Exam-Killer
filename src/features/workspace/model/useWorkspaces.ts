// =============================================================================
// features/workspace/model/useWorkspaces.ts
// Layer: features → workspace → model
// Tool: TanStack Query (server state — cached, refetchable, optimistic)
// =============================================================================

'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  WorkspacesQuery,
  WorkspacesResponse,
  WorkspaceDetailResponse,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/shared/types/api';

import {
  fetchWorkspaces,
  fetchWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../api/workspaceApi';

// ---------------------------------------------------------------------------
// Query key factory — keeps keys consistent and avoids magic strings
// ---------------------------------------------------------------------------

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (q: WorkspacesQuery) => [...workspaceKeys.lists(), q] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Paginated + filtered workspace list.
 * Uses a stale time of 30s to keep the list fresh without hammering the server.
 */
export function useWorkspaces(
  query: WorkspacesQuery = {},
  options?: Omit<UseQueryOptions<WorkspacesResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<WorkspacesResponse>({
    queryKey: workspaceKeys.list(query),
    queryFn: () => fetchWorkspaces(query),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * Full workspace detail (sources, members, flashcard stats, recent sessions).
 */
export function useWorkspace(
  id: string,
  options?: Omit<UseQueryOptions<WorkspaceDetailResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<WorkspaceDetailResponse>({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => fetchWorkspace(id),
    enabled: !!id,
    staleTime: 60_000,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new workspace. Invalidates the list cache on success. */
export function useCreateWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkspaceRequest) => createWorkspace(payload),

    onSuccess: () => {
      toast.success('Workspace created successfully');
      void qc.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
    },
  });
}

/** Update workspace metadata. Optimistically updates the detail cache. */
export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateWorkspaceRequest) => updateWorkspace(id, payload),

    onMutate: async (payload) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: workspaceKeys.detail(id) });

      const previous = qc.getQueryData<WorkspaceDetailResponse>(workspaceKeys.detail(id));

      // Optimistically patch the cached detail
      if (previous) {
        qc.setQueryData<WorkspaceDetailResponse>(workspaceKeys.detail(id), {
          ...previous,
          workspace: { ...previous.workspace, ...payload },
        });
      }

      return { previous };
    },

    onError: (err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        qc.setQueryData(workspaceKeys.detail(id), context.previous);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to update workspace');
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    onSuccess: () => {
      toast.success('Workspace updated successfully');
    },
  });
}

/** Delete a workspace. Removes it from the list cache optimistically. */
export function useDeleteWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: workspaceKeys.lists() });

      const previous = qc.getQueriesData<WorkspacesResponse>({
        queryKey: workspaceKeys.lists(),
      });

      // Remove the deleted item from all list caches
      qc.setQueriesData<WorkspacesResponse>({ queryKey: workspaceKeys.lists() }, (old) =>
        old
          ? {
              ...old,
              workspaces: old.workspaces.filter((w) => w.id !== id),
            }
          : old,
      );

      return { previous };
    },

    onError: (err, _id, context) => {
      // Rollback all list caches
      if (context?.previous) {
        context.previous.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete workspace');
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    onSuccess: () => {
      toast.success('Workspace deleted successfully');
    },
  });
}
