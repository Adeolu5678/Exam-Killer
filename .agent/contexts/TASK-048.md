# TASK-048 Context: Verify Kilo+Gemini on NoteBookLM Branch (Audit + Build)

## Objective

Verification pass after TASK-047. Confirms the Kilo/Gemini migration is clean on the NoteBookLM
branch and that the entire codebase — including all NotebookLM infrastructure — builds without
errors.

## Checklist

### Client Migration

- [ ] `src/shared/lib/openai/client.ts` — exports `kiloClient`, `getChatCompletion`, `getEmbedding`,
      `isKiloConfigured`, `isGeminiConfigured`. Does NOT reference `OPENAI_API_KEY` or `gpt-4o`.
- [ ] `src/shared/lib/openai/mock-data.ts` — line 1 gates on `KILO_API_KEY`. `getMockEmbedding()`
      returns `Array(768)`.
- [ ] `@google/generative-ai` is present in `package.json` and `node_modules`.

### NLM Integration — Untouched Verification

- [ ] `src/shared/lib/notebooklm/client.ts` — does NOT import from `@/shared/lib/openai/client`
- [ ] `src/app/api/notebooklm/` — no file imports `getChatCompletion` or `getEmbedding`
- [ ] The NLM routes still work independently of the Kilo client

### General AI Routes — Still Wired Correctly

Each of these should still import `getChatCompletion` from `@/shared/lib/openai/client`
(which now routes to Kilo Gateway):

- [ ] `src/app/api/chat/tutor/route.ts`
- [ ] `src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts`
- [ ] `src/app/api/workspaces/[workspaceId]/quiz/generate/route.ts`
- [ ] `src/app/api/workspaces/[workspaceId]/exam/generate/route.ts`
- [ ] `src/app/api/study-plan/create/route.ts`

### RAG Embeddings

- [ ] `src/shared/lib/rag/embeddings.ts` — imports `getEmbedding` from `@/shared/lib/openai/client`
- [ ] No file in `src/` calls `openai.embeddings.create()` directly

### Build

```bash
npx tsc --noEmit   # exit 0
npm run lint        # exit 0, zero warnings
```

## Update Task Registry

After all checks pass:

1. Mark TASK-047 as ✅ COMPLETED in `.agent/docs/task-registry.md`
2. Mark TASK-048 as ✅ COMPLETED in `.agent/docs/task-registry.md`
3. Update Quick Stats: Total = 48, Pending = 0, Completed = 48
4. Update "Last Updated" date to 2026-03-21
