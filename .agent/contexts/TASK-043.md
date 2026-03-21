# TASK-043 Context: Verify Embeddings Migration & Recreate Pinecone Index at 768 dims

## What This Task Is

Verification task that runs AFTER TASK-042. Confirms the Gemini embeddings migration is complete,
handles the Pinecone dimension mismatch (1536 → 768), and runs a full build + lint pass.

## Critical: Pinecone Index Must Be Recreated

The existing Pinecone index `exam-killer` is at **1536 dimensions** (for OpenAI text-embedding-3-small).
Gemini `text-embedding-004` outputs **768 dimensions**. These are incompatible — writing 768-dim
vectors to a 1536-dim index will throw runtime errors.

### Step 1 — Locate the Pinecone Index Init Code

Search `src/shared/lib/rag/` for wherever the Pinecone index is referenced or initialized.
Common filenames: `pinecone.ts`, `index.ts`, `config.ts`. Find where `dimension` is specified.

Update the dimension constant from `1536` → `768`:

```typescript
// Before
const EMBEDDING_DIMENSION = 1536;

// After
const EMBEDDING_DIMENSION = 768;
```

### Step 2 — Leave User Instructions for Manual Pinecone Recreation

The Pinecone index itself cannot be resized programmatically. Add this comment block prominently
in the Pinecone client/config file:

```typescript
/**
 * ⚠️  ACTION REQUIRED: Pinecone Index Recreation
 *
 * The embedding model has changed from text-embedding-3-small (1536 dims)
 * to Gemini text-embedding-004 (768 dims). The Pinecone index dimension
 * cannot be changed in-place.
 *
 * MANUAL STEPS (one-time, done once by the project owner):
 * 1. Go to https://app.pinecone.io
 * 2. Delete the existing 'exam-killer' index
 * 3. Create a new index named 'exam-killer' with:
 *    - Dimensions: 768
 *    - Metric: cosine
 *    - Cloud: your current cloud/region settings
 * 4. Existing embeddings will be lost (users' uploaded sources
 *    will need to be re-processed — trigger re-processing from the UI).
 */
```

Also add a note to `.agent/docs/codebase-map.md` under a "⚠️ Infrastructure Notes" section:

```markdown
## ⚠️ Infrastructure Notes

**Pinecone Index Dimension Change (2026-03-20)**:
The embedding model changed to Gemini text-embedding-004 (768 dims).
The `exam-killer` Pinecone index must be manually deleted and recreated at 768 dimensions.
See the comment in `src/shared/lib/rag/pinecone.ts` (or equivalent) for exact steps.
```

## Full Code Audit Checklist

- [ ] `src/shared/lib/openai/client.ts`:
  - `getEmbedding()` uses `geminiClient.getGenerativeModel({ model: 'text-embedding-004' })`
  - `isGeminiConfigured()` is exported
  - Legacy `openai` export (for OpenAI embeddings) is removed or clearly marked deprecated
- [ ] `src/shared/lib/openai/mock-data.ts`:
  - `getMockEmbedding()` returns `Array(768)` not `Array(1536)`
- [ ] `src/shared/lib/rag/embeddings.ts`:
  - No direct `openai` import; only uses `getEmbedding()` from `@/shared/lib/openai/client`
- [ ] Pinecone config file: dimension updated to `768`
- [ ] `.env.example`: has `GEMINI_API_KEY=` entry
- [ ] No file in `src/` calls `openai.embeddings.create()` directly

## Build & Lint

```bash
npx tsc --noEmit   # must exit 0
npm run lint        # must exit 0, zero warnings
```

## Update Task Registry

1. Mark TASK-042 as ✅ COMPLETED in `.agent/docs/task-registry.md`
2. Mark TASK-043 as ✅ COMPLETED in `.agent/docs/task-registry.md`
3. Update Quick Stats (Pending: 0, Completed count++)
4. Add to TASK-042 detail block:
   - "Provider chosen: Google Gemini text-embedding-004"
   - "Embedding dimension: 768"
   - "Pinecone index recreation required: YES — see instructions in pinecone config file"
