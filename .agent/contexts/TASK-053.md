# TASK-053 — Pre-Production Audit: Feature Hook Data Flow & Error States

**Priority**: P0 🔴 CRITICAL
**Status**: ⬚ PENDING
**Dependencies**: None (can run in parallel with TASK-052)

---

## Objective

Audit the FSD feature hooks and UI components for the most common runtime bugs a real user
will encounter. Focus on:

1. **Stale workspace ID bugs** — hooks that use `workspaceId` from URL params but don't
   handle the case where it's `undefined` on first render (Next.js dynamic routes).
2. **Missing `enabled` guards on queries** — TanStack Query hooks that fire before
   `workspaceId` is available will throw 400s. All workspace-scoped queries must have
   `enabled: Boolean(workspaceId)`.
3. **Optimistic update rollback gaps** — mutations that do optimistic list removal but
   don't have an `onError` rollback. If the server returns an error, the UI will silently
   show a deleted item that wasn't actually deleted.
4. **Streaming error handling in tutor chat** — the `useSendMessage` hook accumulates
   stream chunks. Verify: if the stream errors mid-way, does the partial assistant message
   get cleaned up or left as a ghost bubble?
5. **File upload error surface** — in `SourceList` / `UploadZone`, if `uploadSource` XHR
   fails with a 413 (file too large) or 415 (unsupported type), does the user see a
   readable error? Or a raw "Request failed: 413"?

---

## Files to Audit

### TanStack Query hooks

| File                                         | Check                                           |
| -------------------------------------------- | ----------------------------------------------- |
| `features/flashcards/model/useFlashcards.ts` | `enabled` guard, `onError` in mutations         |
| `features/quizzes/model/useQuizzes.ts`       | `enabled` guard, rollback in `useDeleteQuiz`    |
| `features/tutor/model/useTutor.ts`           | Stream error cleanup, ghost message removal     |
| `features/sources/model/useSources.ts`       | XHR error message mapping, rollback             |
| `features/workspace/model/useWorkspaces.ts`  | `enabled` guard on `useWorkspace` detail query  |
| `features/analytics/model/useAnalytics.ts`   | `enabled` guards (should already have them)     |
| `features/study-plan/model/useStudyPlan.ts`  | `enabled` guards on session + exam date queries |

### Key fixes to apply

#### Fix: Stream ghost message cleanup

In `features/tutor/model/useTutor.ts`, inside the streaming mutation's `onError` or catch:

```typescript
// Remove the placeholder assistant message if stream failed
setMessages((prev) => prev.filter((m) => m.id !== streamingMessageId));
```

#### Fix: Human-readable upload errors

In `features/sources/api/sourcesApi.ts`, the XHR error handler maps status codes:

```typescript
const friendlyMessage =
  xhr.status === 413
    ? 'File is too large (max 50 MB)'
    : xhr.status === 415
      ? 'File type not supported'
      : (error.error ?? 'Upload failed');
reject(new Error(friendlyMessage));
```

#### Fix: `enabled` guards

Any `useQuery` that accepts `workspaceId` should have:

```typescript
enabled: Boolean(workspaceId),
```

---

## Verification

```bash
npx tsc --noEmit
npm run lint
```

Both must exit code 0. Update task registry: mark TASK-053 ✅ COMPLETED when done.
