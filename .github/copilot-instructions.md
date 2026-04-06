# Copilot instructions for Exam-Killer

## Build, test, and lint commands

Run from repository root (`Exam-Killer`) unless noted.

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
```

Testing is not wired to an npm script yet. Use Vitest directly:

```bash
# Run a single test file
npx vitest run src/test.spec.ts

# Run one test case by name in a single file
npx vitest run src/test.spec.ts -t "test name"
```

If you modify Firebase Cloud Functions code in `functions/`, use that package separately:

```bash
cd functions
npm install
npm run build
npm run lint
```

## High-level architecture

- **App shape**: Next.js 14 App Router + TypeScript strict mode. The app shell is assembled in `src/app`, while most domain logic lives in `src/features` and `src/shared`.

- **FSD layering (enforced by ESLint)**: `app -> widgets -> features -> shared`.  
  `src/app` pages/layouts are intended to be thin composition layers; business logic belongs in features/shared modules.

- **Auth flow**:
  - Firebase client auth runs in `AuthContext` (`src/context/AuthContext.tsx`).
  - Client exchanges Firebase ID token with `/api/auth/session` to set an HTTP-only `session` cookie.
  - `src/middleware.ts` protects dashboard/workspace/profile/settings routes based on that cookie.
  - API routes use wrappers from `src/shared/lib/api/auth.ts` (`withAuth`, `withAdminAuth`, `withOwnership`).

- **Data and AI pipeline**:
  - Core app data is in Firestore (`workspaces`, `sources`, `workspace_members`, etc.).
  - Uploaded source files go to Firebase Storage; upload endpoint is `POST /api/workspaces/[workspaceId]/sources`.
  - Upload triggers processing at `POST /api/sources/[sourceId]/process`: extract text -> chunk -> embed -> upsert Pinecone vectors (namespace = `workspaceId`).
  - Tutor/quiz/flashcard/exam generation routes retrieve context from vector search (`src/shared/lib/rag/*`) and then call chat completion (`src/shared/lib/openai/client.ts`).

- **AI provider split**:
  - Chat completion uses Google Gemini (`GEMINI_API_KEY`, default model `gemini-3.1-flash-lite-preview`).
  - Embeddings use Google Gemini (`GEMINI_API_KEY`, default model `gemini-embedding-2-preview`).

- **Subscription gating**:
  - Paystack-backed plan/usage logic in `src/shared/lib/paystack/*`.
  - AI-heavy routes (for example tutor chat) check usage limits before model calls.

## Key conventions

- **Import boundaries matter**:
  - Follow FSD dependency direction (`app -> widgets -> features -> shared`).
  - Consume feature modules through their public `index.ts` exports (e.g., `@/features/workspace`), not deep internal paths.

- **API route pattern**:
  - Prefer `withAuth` + `errorResponse`/`successResponse` helpers from `src/shared/lib/api/auth.ts`.
  - Prefer Zod request parsing via `parseBodyWithZod` for input validation and consistent 400 responses.

- **Path aliases**: use `@/*` imports (configured in `tsconfig.json`).

- **Firestore field naming**: existing documents and API payload mappings are predominantly `snake_case` (`workspace_id`, `user_id`, `created_at`, etc.). Keep this consistent when adding persisted fields.

- **Source processing status contract**:
  - Backend status values: `pending`, `processing`, `completed`, `failed`.
  - Frontend derives UI stages from these flags in `src/features/sources/model/types.ts`; keep backend/frontend status semantics aligned.

- **Dashboard/workspace composition**:
  - `src/app/dashboard/layout.tsx` installs a shared TanStack Query client and wraps UI in `AppShell`.
  - Workspace subroutes are wrapped by `WorkspaceShell` in `src/app/dashboard/workspace/[workspaceId]/layout.tsx`.

- **Configuration expectations**:
  - Firebase client and admin env vars are required for full functionality (`.env.example`).
  - Pinecone is required for vector retrieval paths.
  - `functions/` is a separate Node package and is excluded from root TS config; treat it as an independent build/lint target.
