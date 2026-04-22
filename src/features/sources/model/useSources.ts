// =============================================================================
// features/sources/model/useSources.ts
// Layer: features → sources → model
// Purpose: TanStack Query v5 hooks for all sources server–state.
// =============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';

import { useSourcesStore } from './sourcesStore';
import type { SourceItem, UploadProgress } from './types';
import { fetchSources, uploadSource, deleteSource, processSource } from '../api/sourcesApi';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const sourceKeys = {
  all: ['sources'] as const,
  lists: () => [...sourceKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...sourceKeys.lists(), workspaceId] as const,
};

// ---------------------------------------------------------------------------
// useSources — paginated source list for a workspace
// ---------------------------------------------------------------------------

export function useSources(workspaceId: string) {
  return useQuery({
    queryKey: sourceKeys.list(workspaceId),
    queryFn: () => fetchSources(workspaceId, 1, 100),
    enabled: Boolean(workspaceId),
    select: (data) => data.sources,
    staleTime: 1000 * 60, // 1 min
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing =
        Array.isArray(data) &&
        data.some(
          (source) =>
            source.embedding_status === 'processing' || source.embedding_status === 'pending',
        );
      return hasProcessing ? 3000 : false;
    },
  });
}

// ---------------------------------------------------------------------------
// useUploadSource — XHR upload with progress tracking
// ---------------------------------------------------------------------------

export function useUploadSource(workspaceId: string) {
  const queryClient = useQueryClient();
  const { startUpload, updateProgress, completeUpload, failUpload } = useSourcesStore();

  const mutation = useMutation({
    mutationFn: async ({ file, id }: { file: File; id?: string }) => {
      const queueId = id ?? nanoid();
      startUpload(queueId);

      const onProgress = (p: UploadProgress) => updateProgress(queueId, p);

      try {
        const source = await uploadSource(workspaceId, file, onProgress);
        completeUpload(queueId, source.id);
        return source;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        failUpload(queueId, msg);
        throw err;
      }
    },

    onSuccess: (_data: SourceItem) => {
      // Invalidate the list so new source appears immediately
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list(workspaceId) });
      toast.success('Source uploaded successfully');
    },
  });

  return mutation;
}

// ---------------------------------------------------------------------------
// useDeleteSource — optimistic removal
// ---------------------------------------------------------------------------

export function useDeleteSource(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),

    // Optimistic update: remove from local cache before network call
    onMutate: async (sourceId: string) => {
      await queryClient.cancelQueries({ queryKey: sourceKeys.list(workspaceId) });

      const previous = queryClient.getQueryData<{ sources: SourceItem[] }>(
        sourceKeys.list(workspaceId),
      );

      queryClient.setQueryData<{ sources: SourceItem[] }>(sourceKeys.list(workspaceId), (old) => ({
        ...(old ?? { sources: [], pagination: { total: 0, page: 1, limit: 100 } }),
        sources: (old?.sources ?? []).filter((s) => s.id !== sourceId),
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, _sourceId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(sourceKeys.list(workspaceId), ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete source');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list(workspaceId) });
    },
    onSuccess: () => {
      toast.success('Source deleted successfully');
    },
  });
}

// ---------------------------------------------------------------------------
// useProcessSource — trigger re-embedding for a source
// ---------------------------------------------------------------------------

export function useProcessSource(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceId: string) => processSource(sourceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sourceKeys.list(workspaceId) });
      toast.success('Source queued for processing');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to process source');
    },
  });
}
