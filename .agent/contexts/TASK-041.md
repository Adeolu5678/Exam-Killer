# TASK-041 Context: Verify Kilo Gateway Integration End-to-End

## What This Task Is

A verification and audit task that runs AFTER TASK-040 is complete. Its job is to:

1. Confirm that **every** AI-powered API route in the application is routing through the Kilo
   Gateway client (i.e., `getChatCompletion` from `@/shared/lib/openai/client`).
2. Confirm that **NO** route is directly instantiating OpenAI or using a hardcoded `gpt-4o` model.
3. Confirm the TypeScript build passes with zero errors.
4. Update the `.env.example` and README to reflect the new provider.

## Routes to Audit (All Use getChatCompletion — Verify This)

| Route File                                                          | AI Feature            |
| ------------------------------------------------------------------- | --------------------- |
| `src/app/api/chat/tutor/route.ts`                                   | AI Tutor chat         |
| `src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts` | Flashcard generation  |
| `src/app/api/workspaces/[workspaceId]/quiz/generate/route.ts`       | Quiz generation       |
| `src/app/api/workspaces/[workspaceId]/exam/generate/route.ts`       | Exam generation       |
| `src/app/api/study-plan/create/route.ts`                            | Study plan generation |

## Audit Checklist

For each file above, verify:

- [ ] Imports `getChatCompletion` from `@/shared/lib/openai/client` (NOT `openai` directly)
- [ ] Does NOT hardcode any model name (model is set centrally in `client.ts`)
- [ ] Does NOT instantiate a new `OpenAI()` client locally

## Additional Checks

- [ ] `src/shared/lib/rag/embeddings.ts` imports the embeddings-only `openai` export (not `kiloClient`)
- [ ] `src/shared/lib/openai/client.ts` exports `KILO_CHAT_MODEL` constant set to `minimax/minimax-m2.5-free`
- [ ] `.env.example` has `KILO_API_KEY=` entry with instructions
- [ ] `npx tsc --noEmit` exits with code 0
- [ ] `npm run lint` exits with zero warnings

## If Issues Found

If any route is directly calling OpenAI or hardcoding a model, refactor it to use `getChatCompletion`.
All prompt building is already handled by `src/shared/lib/openai/prompts.ts`.

## Files That Will Need Edits (Only If Audit Reveals Issues)

These should NOT need edits if TASK-040 was done correctly, but check anyway:

- Any API route that directly imports and uses the `openai` package
- `src/shared/lib/rag/embeddings.ts` — should still use the legacy OpenAI client for embeddings
