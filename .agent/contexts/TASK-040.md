# TASK-040 Context: Migrate AI Client to Kilo Gateway (minimax/minimax-m2.5-free)

## What This Task Is

Replace the current OpenAI-direct client in `src/shared/lib/openai/client.ts` with a Kilo Gateway
configured client that routes all chat completions through `minimax/minimax-m2.5-free` (free model).
The `openai` npm package is already installed — Kilo Gateway is OpenAI API-compatible, so only the
`baseURL` and `apiKey` need to change in the client constructor.

## Key Constraint: Embeddings

Kilo Gateway does **not** expose an embeddings endpoint. The RAG pipeline at
`src/shared/lib/rag/embeddings.ts` uses `openai.embeddings.create()` directly via the shared
`openai` client export from `client.ts`.

**Decision**: Keep a second lightweight OpenAI/embedding client in `client.ts` for embeddings only.
If `OPENAI_API_KEY` is absent, fall back to the existing mock embeddings (already implemented in
`mock-data.ts`). This is the safest zero-budget approach.

## Files to Touch

| File                               | Change                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/lib/openai/client.ts`  | PRIMARY CHANGE — reconfigure the main `openai` export to point to Kilo Gateway with `minimax/minimax-m2.5-free`; keep a separate embeddings-only client |
| `src/shared/lib/rag/embeddings.ts` | If needed: import the dedicated embedding client instead of the main Kilo client                                                                        |
| `.env.example`                     | Add `KILO_API_KEY` variable with instructions                                                                                                           |
| `src/shared/lib/openai/README.md`  | Update to reflect Kilo provider                                                                                                                         |

## Environment Variables Required

```
KILO_API_KEY=your_kilo_gateway_api_key
# Get from: https://kilo.ai (create account, go to Dashboard > API Keys)
# The free tier gives $5 signup credit + free model access
```

Kilo Gateway base URL: `https://api.kilo.ai/api/gateway`

## Target Model

`minimax/minimax-m2.5-free` — this is the model string used in the Kilo Gateway API calls.

## Mock Mode Logic (Critical — Do NOT Break)

The existing "mock mode" in `client.ts` is gated on:

```typescript
const MOCK_MODE_ENABLED = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock';
```

After this change, mock mode should be gated on KILO_API_KEY instead:

```typescript
const isKiloConfigured = !!process.env.KILO_API_KEY;
// If Kilo is not configured → fall through to mock responses
```

## Implementation Pattern

```typescript
import OpenAI from 'openai';

// ── 1. Kilo Gateway client (for chat completions) ──────────────────────────
const kiloApiKey = process.env.KILO_API_KEY;

export const kiloClient = new OpenAI({
  baseURL: 'https://api.kilo.ai/api/gateway',
  apiKey: kiloApiKey || 'dummy-key-for-build',
});

const KILO_CHAT_MODEL = 'minimax/minimax-m2.5-free';

// ── 2. Legacy OpenAI client (for embeddings only) ──────────────────────────
const openaiApiKey = process.env.OPENAI_API_KEY;

// This is exported for use in src/shared/lib/rag/embeddings.ts
export const openai = new OpenAI({
  apiKey: openaiApiKey || 'dummy-key-for-build',
});

export function isKiloConfigured(): boolean {
  return !!kiloApiKey;
}

export function isOpenAIConfigured(): boolean {
  return !!openaiApiKey;
}
```

Then in `getChatCompletion`, use `kiloClient` with `model: KILO_CHAT_MODEL`.
In `getEmbedding`, keep using `openai` (the legacy client) - it will fall through to mock if no key.

## Verification Steps

After implementation, run:

```bash
npx tsc --noEmit
npm run lint
```

Zero errors expected. The mock mode should still work when `KILO_API_KEY` is not set.

## Related Files (Read-Only Reference)

- `src/shared/lib/openai/mock-data.ts` — mock responses (do NOT modify)
- `src/shared/lib/openai/prompts.ts` — prompt templates (do NOT modify)
- `src/shared/lib/rag/config.ts` — RAG config (do NOT modify)
- All API routes in `src/app/api/` that call `getChatCompletion` — these are read-only; they
  consumer the centralized function and DO NOT need modification.
