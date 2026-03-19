# TASK-045 Context: Wire Existing Features to NLM Backend

## Goal

Integrate the NotebookLM API routes (built in TASK-042 and TASK-043) into the existing
Exam-Killer FSD feature module hooks. This is a **hook-level wiring task only** — no
UI or visual changes.

## Prerequisites

TASK-040, TASK-041, TASK-042, TASK-043, TASK-044 must be complete.

---

## Background: How the FSD Modules Work

Each feature module lives at `src/features/<module>/`. The public API is exposed through
`src/features/<module>/index.ts`. The data fetching happens in `model/use<Module>.ts`
using TanStack Query hooks. The API calls are in `api/<module>Api.ts`.

You must NOT break existing behaviour. The NLM integration should be **additive** —
existing OpenAI-based generation still works, NLM is an enhanced/alternative path.

---

## Change 1 — `features/workspace/` — Notebook Creation on Workspace Create

**File to modify**: `src/features/workspace/api/workspaceApi.ts`

After a workspace is successfully created (the `createWorkspace` API call returns), also
call `POST /api/notebooklm/notebooks` with the new workspace ID and title.

**File to modify**: `src/features/workspace/model/useWorkspaces.ts`

In `useCreateWorkspace` mutation `onSuccess` callback:

1. Read the new `workspaceId` from the response.
2. Fire a secondary `fetch` to `POST /api/notebooklm/notebooks` with `{ workspaceId, title }`.
3. Do NOT await it in a blocking way — fire it and handle errors silently (log to console).
   The NLM notebook creation should not block or fail the workspace creation UX.

---

## Change 2 — `features/sources/` — Push Source to NLM Notebook on Upload

**File to modify**: `src/features/sources/model/useSources.ts`

In `useUploadSource` mutation `onSuccess` callback:

1. After the source is uploaded to Exam-Killer's own backend, get the source URL or the
   uploaded file public URL from the response.
2. Look up the `notebookId` for the current workspace from `user_notebooks` via a new
   API call: `GET /api/notebooklm/notebooks?workspaceId=<id>` (create this GET route as part
   of this task if it doesn't already exist).
3. If a `notebookId` exists, fire `POST /api/notebooklm/notebooks/<notebookId>/sources`
   with `{ workspaceId, sourceType: 'url', value: <sourceUrl> }`.
4. Again, fire-and-forget. Don't block the upload UX.

**New API route to create** (part of this task):
`GET /api/notebooklm/notebooks?workspaceId=<id>` → returns `{ notebook_id, profile_name }` or `404`.
File: `src/app/api/notebooklm/notebooks/route.ts` (add `GET` handler to existing file).

---

## Change 3 — `features/tutor/` — Route Chat to NLM Query

**File to modify**: `src/features/tutor/api/tutorApi.ts`

Add a new function:

```typescript
export async function sendNlmQuery(
  notebookId: string,
  workspaceId: string,
  prompt: string,
): Promise<{ answer: string }>;
```

This calls `POST /api/notebooklm/notebooks/<notebookId>/query`.

**File to modify**: `src/features/tutor/model/useTutor.ts`

In `useSendMessage`, before calling the existing OpenAI tutor endpoint, check if there
is a `notebookId` for the current workspace (cached from TanStack Query). If it exists,
call `sendNlmQuery` instead of the default tutor endpoint.
If `sendNlmQuery` throws `NLM_QUOTA_EXHAUSTED`, fall back to the existing OpenAI tutor.

---

## Change 4 — `features/flashcards/` — NLM Generation Option

**File to modify**: `src/features/flashcards/api/flashcardsApi.ts`

Add function:

```typescript
export async function generateNlmFlashcards(
  notebookId: string,
  workspaceId: string,
): Promise<{ flashcards: Array<{ question: string; answer: string }> }>;
```

Calls `POST /api/notebooklm/notebooks/<notebookId>/generate/flashcards`.

**File to modify**: `src/features/flashcards/model/useFlashcards.ts`

Add a new `useGenerateNlmFlashcards` hook (using `useMutation`) that calls the new API.
This hook does NOT replace `useGenerateFlashcards` — it is an additional export.

---

## Change 5 — `features/quizzes/` — NLM Generation Option

Same pattern as flashcards:

**Modify**: `src/features/quizzes/api/quizzesApi.ts` — add `generateNlmQuiz()`.
**Modify**: `src/features/quizzes/model/useQuizzes.ts` — add `useGenerateNlmQuiz` hook.
**Modify**: `src/features/quizzes/index.ts` — export the new hook.

---

## FSD Rules

- Feature modules (`src/features/`) MUST NOT directly import from each other.
- Feature modules MUST NOT import from `widgets/` or `app/`.
- All new API calls go through the respective `api/<module>Api.ts` file first.
- Use the pattern `apiFetch` already established in each feature's `api/` file.

## Verification

1. `npx tsc --noEmit` → zero errors.
2. Start `npm run dev`. Create a new workspace → check Firestore `user_notebooks` collection for a new document.
3. Upload a source → check Firestore to confirm the source was pushed to NLM (or check NLM notebook directly via `nlm list-sources --profile nlm_01 --notebook <id>`).
4. Open the chat tutor in a workspace that has a linked NLM notebook → the query should go to NLM.
