# TASK-043 Context: Synchronous Generation API Routes

## Goal

Create five Next.js API routes for synchronous (fast, <30s) NotebookLM generation.
These return results in the same HTTP response — no job queue needed.

## Prerequisites

TASK-040, TASK-041, TASK-042 must be complete.

---

## Routes to Create

All routes live under `src/app/api/notebooklm/notebooks/[notebookId]/generate/`.

### Common Pattern for All Routes

All five routes follow the same structure:

1. `withAuth` authentication.
2. Parse `notebookId` from URL params.
3. `getUserNotebookByNlmId(notebookId)` → verify ownership, get `profile_name`.
4. Call the appropriate `NlmMcpClient` method.
5. `incrementUsage(profileName, 'query')`.
6. Return `200` with structured result.
7. try/catch → `502` on NLM failure.

---

### Route 1: `POST /api/notebooklm/notebooks/[notebookId]/query`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/query/route.ts`

Request body: `{ prompt: string; workspaceId: string; }`
Response: `{ answer: string }`

Calls: `NlmMcpClient.query(profileName, notebookId, prompt)`

---

### Route 2: `POST /api/notebooklm/notebooks/[notebookId]/generate/flashcards`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/generate/flashcards/route.ts`

Request body: `{ workspaceId: string; }`
Response: `{ flashcards: Array<{ question: string; answer: string }> }`

Calls: `NlmMcpClient.generate(profileName, notebookId, 'flashcards')`

The CLI returns JSON or structured text. Parse the result into the `flashcards` array.
If NLM returns raw text, each line with "Q:" + "A:" pattern should be parsed.

---

### Route 3: `POST /api/notebooklm/notebooks/[notebookId]/generate/quiz`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/generate/quiz/route.ts`

Request body: `{ workspaceId: string; questionCount?: number; }`
Response: `{ questions: Array<{ question: string; options: string[]; answer: string }> }`

Calls: `NlmMcpClient.generate(profileName, notebookId, 'quiz')`

---

### Route 4: `POST /api/notebooklm/notebooks/[notebookId]/generate/study-guide`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/generate/study-guide/route.ts`

Request body: `{ workspaceId: string; }`
Response: `{ content: string }` (raw markdown text from NLM)

Calls: `NlmMcpClient.generate(profileName, notebookId, 'study-guide')`

---

### Route 5: `POST /api/notebooklm/notebooks/[notebookId]/generate/mind-map`

**File**: `src/app/api/notebooklm/notebooks/[notebookId]/generate/mind-map/route.ts`

Request body: `{ workspaceId: string; }`
Response: `{ content: string }` (structured text or JSON representing the mind map)

Calls: `NlmMcpClient.generate(profileName, notebookId, 'mind-map')`

---

## Error Handling

| Condition                            | Status | Body                                                |
| ------------------------------------ | ------ | --------------------------------------------------- |
| Auth failed                          | 401    | `{ error: 'Unauthorized' }`                         |
| Notebook not found in Firestore      | 404    | `{ error: 'Notebook not found' }`                   |
| Requesting user doesn't own notebook | 403    | `{ error: 'Forbidden' }`                            |
| All accounts at quota                | 503    | `{ error: 'NLM_QUOTA_EXHAUSTED' }`                  |
| NLM CLI returns error                | 502    | `{ error: 'Generation failed', detail: e.message }` |

## FSD / Code Style Rules

- Declare return types: `Promise<NextResponse>`.
- No `any` types — use `unknown` in catch blocks.
- Import NLM utilities from `@/shared/lib/notebooklm`.
- Use `withAuth` and `parseBodyWithZod` from `@/shared/lib/api/auth`.

## Verification

`npx tsc --noEmit | Select-String "notebooklm.*generate"` → zero errors.
Test one route manually via curl after starting `npm run dev`:

```bash
curl -X POST http://localhost:3000/api/notebooklm/notebooks/<id>/query \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Summarize this material","workspaceId":"ws_test"}'
```
