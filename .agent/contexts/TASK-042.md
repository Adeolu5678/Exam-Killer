# TASK-042 Context: Migrate RAG Embeddings to Google Gemini text-embedding-004

## What This Task Is

The RAG embeddings pipeline currently uses the legacy OpenAI client (`openai.embeddings.create()`)
with `text-embedding-3-small` (1536 dims). The user has no active OpenAI subscription, so this
always fails in production.

**Replacement**: Google Gemini `text-embedding-004` via the `@google/generative-ai` SDK.

- Free tier: ~90M tokens/month (1,500 requests/day × 2,048 tokens/request)
- Output dimensions: **768**
- SDK package: `@google/generative-ai` (check if already installed; if not, install it)
- API key: already in `.env.local` as `GEMINI_API_KEY`

## Pinecone Dimension Impact

The current Pinecone index `exam-killer` was created for `text-embedding-3-small` at **1536 dims**.
Gemini `text-embedding-004` outputs **768 dims** — these are INCOMPATIBLE.

The Pinecone index must be recreated at 768 dimensions. This cannot be done in code — the user
must do it manually. Leave a clear instructional comment in the code and a note in the task registry.
See TASK-043 for the Pinecone handling steps.

## Files to Touch

| File                                 | Change                                                               |
| ------------------------------------ | -------------------------------------------------------------------- |
| `src/shared/lib/openai/client.ts`    | Replace `getEmbedding()` — use Gemini SDK instead of `openai`        |
| `src/shared/lib/openai/mock-data.ts` | Update `getMockEmbedding()` to return `Array(768)` not `Array(1536)` |
| `.env.example`                       | Add `GEMINI_API_KEY=` entry with instructions                        |
| `package.json`                       | Add `@google/generative-ai` if not already present                   |

## Check if SDK is already installed

```bash
cat package.json | grep google
```

If `@google/generative-ai` is not present, install it:

```bash
npm install @google/generative-ai
```

## Implementation

Replace the `getEmbedding()` function in `src/shared/lib/openai/client.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export function isGeminiConfigured(): boolean {
  return !!geminiApiKey;
}

/**
 * Generates a text embedding vector.
 * Provider: Google Gemini — text-embedding-004 (free tier)
 * Dimensions: 768
 * Fallback: mock embedding (random vector, 768 dims) when GEMINI_API_KEY is not set
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!isGeminiConfigured() || !geminiClient) {
    return getMockEmbedding();
  }

  try {
    const model = geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Gemini embedding error:', error);
    throw new Error(
      `Failed to get embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
```

## Update getMockEmbedding() in mock-data.ts

Change the mock from 1536 to 768 dimensions:

```typescript
export function getMockEmbedding(): number[] {
  return Array(768)
    .fill(0)
    .map(() => Math.random() * 2 - 1);
}
```

## Remove or Deprecate the Legacy OpenAI Export

After this change, check whether the `openai` export (legacy OpenAI client) in `client.ts` is
still used anywhere other than `getEmbedding()`. Run:

```bash
Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "from.*openai/client.*openai\b"
```

If nothing else imports the raw `openai` export, remove it from `client.ts`. The only exports
needed are: `kiloClient`, `getChatCompletion`, `getEmbedding`, `isKiloConfigured`,
`isGeminiConfigured`.

## Also Update: generateEmbeddings in embeddings.ts

Verify `src/shared/lib/rag/embeddings.ts` still calls `getEmbedding()` from `@/shared/lib/openai/client`.
It should already do this, but confirm it does NOT import or use `openai` directly.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
```

Both must exit 0. The embedding dimension is now 768 — this will be reflected in mock data.
