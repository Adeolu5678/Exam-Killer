# TASK-049 — Rip Out NLM Wiring from Feature Hooks

**Priority**: P0 🔴 CRITICAL  
**Status**: ⬚ PENDING  
**Dependencies**: None

---

## Objective

The NotebookLM integration is being completely removed. All AI requests must go exclusively
through the Kilo Gateway (`getChatCompletion` from `@/shared/lib/openai/client`). This task
removes every NLM API call that was wired into feature hooks during TASK-045, reverting the
hooks to their pre-TASK-045 state (Kilo-only).

---

## Files to Modify

### 1. `src/features/workspace/api/workspaceApi.ts`

- Remove the `createNlmNotebook()` helper function (approx lines 125–145)
- Remove any `createNlmNotebook` call from inside `createWorkspace` or equivalent

### 2. `src/features/tutor/api/tutorApi.ts`

- Remove `sendNlmQuery()` function (calls `/api/notebooklm/notebooks/${notebookId}/query`)
- Remove `fetchNlmNotebookId()` or any function that fetches `notebook_id` from the NLM route
- The core `sendMessage`, `sendMessageStream`, and `fetchConversationHistory` functions must remain untouched

### 3. `src/features/sources/api/sourcesApi.ts`

- Remove `pushSourceToNlm()` and any function that looks up `notebook_id` from NLM routes
- Remove the call to `/api/notebooklm/notebooks/${notebookId}/sources`

### 4. `src/features/flashcards/api/flashcardsApi.ts`

- Remove `generateFlashcardsNlm()` which calls `/api/notebooklm/notebooks/${notebookId}/flashcards`
- Remove `fetchNlmNotebookId()` local helper if it exists

### 5. `src/features/flashcards/model/useFlashcards.ts`

- Remove `useGenerateFlashcardsFromNlm` hook (or equivalent) that called the NLM flashcard route
- Keep `useCreateFlashcard` and the standard `generateFlashcards` mutation untouched

### 6. `src/features/quizzes/api/quizzesApi.ts`

- Remove `generateQuizNlm()` which calls `/api/notebooklm/notebooks/${notebookId}/quiz`
- Remove `fetchNlmNotebookId()` local helper if it exists

### 7. `src/features/quizzes/model/useQuizzes.ts`

- Remove `useGenerateQuizFromNlm` hook (or equivalent) that called the NLM quiz route
- Keep the standard `useGenerateQuiz` mutation untouched

---

## What Must NOT Be Touched

- `src/shared/lib/openai/client.ts` — already correct, Kilo-powered
- All standard (non-NLM) API functions in the feature modules
- Any existing TanStack Query hooks that call the standard `/api/flashcards`, `/api/quizzes`, etc.
- `src/shared/lib/notebooklm/` — leave for TASK-050 to delete
- `src/app/api/notebooklm/` — leave for TASK-050 to delete

---

## Verification

After each file edit, run:

```bash
npx tsc --noEmit
```

At the end:

```bash
npx tsc --noEmit
npm run lint
```

Both must exit with zero errors.

Update task registry: mark TASK-049 ✅ COMPLETED when done.
