# Exam-Killer Ground-Up Rebuild Plan

**Date:** 2026-04-07  
**Version:** v1  
**Status:** Build-ready planning document  
**Plan file:** `plans/2026-04-07-ground-up-rebuild-plan-v1.md`

---

## 1. Purpose of this document

This document is the operating blueprint for rebuilding Exam-Killer from scratch into a more reliable, maintainable, and scalable product.

It is based on:

- the product intent in the PRD (`PRD.md:5-10`, `PRD.md:31-39`, `PRD.md:58-145`)
- the deeper technical specification in the SSD (`SSD.md:7-14`, `SSD.md:29-120`, `SSD.md:169-260`, `SSD.md:592-860`, `SSD.md:3707-3822`)
- the visual and frontend architecture blueprint (`Frontend Redesign Blueprint:6-10`, `Frontend Redesign Blueprint:120-161`, `Frontend Redesign Blueprint:187-241`)
- the current codebase, configuration, and deployment reality (`package.json:6-20`, `next.config.js:1-19`, `vercel.json:1-69`, `Dockerfile:1-54`, `src/app/layout.tsx:12-77`, `src/middleware.ts:29-57`)

The goal is not to patch the current app. The goal is to define the correct target system and the safest path to rebuild it.

---

## 2. Product summary to preserve in the rebuild

Exam-Killer is intended to be an AI-powered study companion for Nigerian university students, centered on course-specific workspaces that ingest study materials and generate tutoring, flashcards, quizzes, study plans, analytics, and collaborative study tools (`PRD.md:10-11`, `PRD.md:33-39`, `PRD.md:58-145`).

### 2.1 Core product pillars

The rebuild must preserve these product pillars:

1. **Study workspaces** for each course or subject (`PRD.md:58-70`)
2. **AI tutor** with selectable personalities and contextual answers (`PRD.md:71-93`)
3. **Spaced repetition flashcards** (`PRD.md:94-103`)
4. **Practice and assessment** through quizzes and exam simulation (`PRD.md:114-123`)
5. **Analytics and progress tracking** (`PRD.md:124-133`)
6. **Collaboration, sharing, and export** as premium differentiators (`PRD.md:104-113`, `PRD.md:136-145`)
7. **Subscription-driven monetization** using free, premium monthly, and annual plans (`PRD.md:376-407`)

### 2.2 Business constraints the rebuild must respect

- The product is mobile-first and intended to feel premium (`PRD.md:39`, `Frontend Redesign Blueprint:8-10`, `Frontend Redesign Blueprint:18-47`)
- The product currently targets a fast launch and early monetization (`PRD.md:7-8`, `PRD.md:460-496`)
- The free plan is intentionally constrained and monetization gates are already embedded in the current implementation (`PRD.md:378-399`, `src/shared/lib/paystack/subscription.ts:43-113`)

---

## 3. Current application audit

This section captures what exists today so the rebuild starts from reality rather than assumptions.

### 3.1 Current stack in production code

The current implementation uses:

- **Next.js 14 App Router** (`package.json:64`, `next.config.js:9-19`)
- **React 18** (`package.json:68-69`)
- **TypeScript** in strict mode per project guidelines and package setup (`package.json:73`, `tsconfig.json` already reviewed in session)
- **Firebase** for auth, Firestore, storage, and admin access (`package.json:54-56`, `src/shared/lib/firebase/client.ts:1-23`, `src/shared/lib/firebase/admin.ts:1-145`)
- **Gemini APIs**, despite the product docs describing OpenAI (`PRD.md:156-158`, `src/shared/lib/openai/client.ts:1-33`)
- **Pinecone** for vector storage (`package.json:45`, `src/shared/lib/rag/vector-store.ts:1-27`)
- **Paystack** for payments and subscriptions (`PRD.md:159`, `src/shared/lib/paystack/subscription.ts:15-113`, `src/app/api/payments/webhook/route.ts:1-240`)
- **TanStack Query + Zustand** for state management (`package.json:46`, `package.json:75`, `src/app/dashboard/layout.tsx:14-36`, `Frontend Redesign Blueprint:187-201`)
- **Framer Motion**, **Recharts**, **jspdf**, and PWA support (`package.json:43`, `package.json:57`, `package.json:60`, `package.json:70`, `next.config.js:1-19`)

### 3.2 Current source structure

The source tree already partially follows a feature-sliced shape:

- `src/app` for routes and API handlers
- `src/features` for business domains
- `src/shared` for primitives, libraries, hooks, stores, and types
- `src/widgets` for composed layout widgets (`src/app/layout.tsx:38-77`, `src/app/dashboard/layout.tsx:95-104`)

Observed top-level source directories:

- `src/app`
- `src/context`
- `src/features`
- `src/shared`
- `src/styles`
- `src/widgets` (`/tmp/forge_shell_stdout_tK94Km.txt:1-17` and shell inventory gathered in session)

Observed feature domains:

- analytics
- flashcards
- identity
- quizzes
- sources
- study-plan
- tutor
- workspace (`src/features` tree listed during audit)

Observed shared library domains:

- analytics
- api
- auth
- firebase
- openai
- paystack
- rag
- spaced repetition (`src/shared/lib` tree listed during audit)

### 3.3 Current route surface

The app already has a large route and API footprint. Major API domains currently present include:

- admin verifications
- analytics
- auth
- tutor chat
- exams
- exports
- flashcards
- identity verification
- payments
- profile
- quizzes
- sharing
- sources
- study plans
- workspaces (`/tmp/forge_shell_stdout_tK94Km.txt:1-219`)

This is important: the app is not “small but buggy.” It is already a broad platform, so the rebuild must reduce scope complexity at the architecture layer even if the product surface stays ambitious.

### 3.4 Current page architecture quality

Some pages are reasonably thin, for example:

- dashboard page is mostly an assembler (`src/app/dashboard/page.tsx:1-130`)
- workspace analytics page is a thin lazy-loaded shell (`src/app/dashboard/workspace/[workspaceId]/analytics/page.tsx:1-30`)
- tutor workspace page lazy-loads the main chat UI (`src/app/dashboard/workspace/[workspaceId]/chat/page.tsx:1-43`)

But other pages are still monolithic and difficult to reason about:

- landing page is a very large client component (`src/app/page.tsx:1-176`, `src/app/page.tsx:177-220` and total size observed at 1067 lines)
- settings page is extremely large and client-heavy (`src/app/dashboard/settings/page.tsx:1-15`, `src/app/dashboard/settings/page.tsx:105-255` and total size observed at 1592 lines)
- authentication and subscription logic are concentrated in a legacy context provider (`src/context/AuthContext.tsx:32-45`, `src/context/AuthContext.tsx:77-138`, `src/context/AuthContext.tsx:140-210`)

### 3.5 Current layout and shell model

The app already contains a strong design direction for the app shell:

- root layout initializes theme, typography variables, manifest, and toaster (`src/app/layout.tsx:12-77`)
- dashboard layout mounts TanStack Query and wraps children with the app shell (`src/app/dashboard/layout.tsx:26-37`, `src/app/dashboard/layout.tsx:43-104`)
- the widget shell implements top bar, sidebar, mobile drawer, command palette trigger, and upgrade CTA (`src/widgets/AppShell/AppShell.tsx:1-27`, `src/widgets/AppShell/AppShell.tsx:69-160`, `src/widgets/AppShell/AppShell.tsx:173-210`, `src/widgets/AppShell/AppShell.tsx:223-260`)

This means the rebuild should **not** throw away the information architecture. It should formalize it and reduce coupling.

---

## 4. Current-state problems that justify the rebuild

### 4.1 Product docs and implementation are drifting

There are meaningful mismatches between the product docs and the code:

- PRD and SSD describe **OpenAI GPT-4o**, while the current implementation has migrated to **Gemini** (`PRD.md:156-158`, `SSD.md:52-54`, `src/shared/lib/openai/client.ts:1-33`)
- PRD data model uses fields like `owner_id`, while code and Firestore rules rely heavily on `user_id` (`PRD.md:188-201`, `src/shared/types/database.ts:34-46`, `firestore.rules:15-17`, `firestore.rules:38-46`)
- PRD page structure includes `/workspace/[id]` roots, while the current app nests workspace pages under `/dashboard/workspace/[workspaceId]` (`PRD.md:352-372`, `src/app/dashboard/workspace/[workspaceId]/chat/page.tsx:22-40`, `src/app/dashboard/workspace/[workspaceId]/flashcards/page.tsx:20-54`)
- SSD deployment spec assumes additional Next/Vercel function tuning that the current `vercel.json` does not implement (`SSD.md:3711-3756`, `vercel.json:1-69`)

**Rebuild implication:** the first deliverable must be a **canonical architecture spec** that supersedes conflicting docs.

### 4.2 Boundaries are present, but enforcement is incomplete

The codebase clearly intends to use a feature-sliced architecture (`Frontend Redesign Blueprint:122-161`, `src/app/dashboard/page.tsx:3-23`), but there are still leakage points:

- `AuthContext` is a broad cross-cutting dependency injected into layouts and widgets (`src/app/layout.tsx:72-73`, `src/app/dashboard/layout.tsx:43-56`, `src/widgets/AppShell/AppShell.tsx:19-24`, `src/context/AuthContext.tsx:32-45`)
- large client pages still own business, networking, and mutation behavior directly (`src/app/dashboard/settings/page.tsx:131-255`)
- API handlers repeatedly implement authorization and access checks instead of using a consistent policy layer (`src/app/api/workspaces/[workspaceId]/route.ts:53-123`, `src/app/api/workspaces/[workspaceId]/sources/route.ts:38-67`, `src/app/api/chat/tutor/route.ts:67-94`)

**Rebuild implication:** the new app needs explicit layer contracts for UI, use cases, repositories, policies, and external providers.

### 4.3 Authentication and session handling are more complex than they should be

The current auth flow combines:

- Firebase client auth
- session cookie creation and clearing via API
- server validation in middleware
- context-based subscription loading (`src/context/AuthContext.tsx:53-75`, `src/context/AuthContext.tsx:85-138`, `src/middleware.ts:10-45`)

This produces a fragile chain with multiple moving pieces:

1. client auth state changes
2. session cookie API write
3. middleware local JWT validation
4. server-side validation fetch
5. page-level context checks (`src/context/AuthContext.tsx:91-109`, `src/middleware.ts:10-33`, `src/app/dashboard/layout.tsx:52-75`)

**Rebuild implication:** adopt one canonical auth model:

- server-trusted session cookies as the only protected-route authority
- a thin client auth adapter for login/logout only
- no duplicated auth truth between middleware, context, and page-level fetch logic

### 4.4 API handlers are broad and expensive

Examples:

- workspace detail route loads workspace, owner, sources, flashcards, computes due counts, updates `last_accessed`, and still returns `recent_sessions: []` (`src/app/api/workspaces/[workspaceId]/route.ts:125-207`)
- tutor chat route handles access control, plan entitlement, retrieval, prompt building, quota consumption, streaming, and message persistence in a single handler (`src/app/api/chat/tutor/route.ts:149-260`)
- source upload route uploads files, creates source records, then self-calls another API endpoint to trigger processing (`src/app/api/workspaces/[workspaceId]/sources/route.ts:153-240`)

**Rebuild implication:** the backend must be refactored around domain use cases and async jobs, not giant route handlers.

### 4.5 File ingestion and RAG are functional but operationally weak

Current RAG behavior includes:

- Pinecone namespace per workspace (`src/shared/lib/rag/vector-store.ts:91-99`, `src/shared/lib/rag/vector-store.ts:156-177`)
- embedding generation via Gemini (`src/shared/lib/openai/client.ts:187-205`)
- retrieval plus optional hybrid keyword blending and LLM reranking (`src/shared/lib/rag/retriever.ts:25-60`, `src/shared/lib/rag/retriever.ts:170-218`, `src/shared/lib/rag/retriever.ts:220-260`)
- storage of full chunk content inside vector metadata (`src/shared/lib/rag/vector-store.ts:12-19`, `src/shared/lib/rag/vector-store.ts:97-107`)

Risks in the current design:

- content duplication between source storage and vector metadata
- unclear idempotency for chunk regeneration
- upload processing depends on an internal fetch to another API route instead of a durable job queue (`src/app/api/workspaces/[workspaceId]/sources/route.ts:221-240`)
- file URLs are built as direct Google Storage URLs while files are described as private (`src/app/api/workspaces/[workspaceId]/sources/route.ts:197-207`)

**Rebuild implication:** ingestion must become a real background pipeline with explicit jobs, retries, statuses, and signed file access.

### 4.6 Payments, subscriptions, identity verification, and feature gating are tightly interwoven

The app already supports:

- subscription plans and feature entitlements (`src/shared/lib/paystack/subscription.ts:15-113`)
- user subscription persistence and usage tracking (`src/shared/lib/paystack/db.ts:67-195`)
- webhook verification with dedupe support (`src/app/api/payments/webhook/route.ts:21-29`, `src/app/api/payments/webhook/route.ts:112-135`)
- tutor, flashcard, and upload limits enforced in domain routes (`src/app/api/chat/tutor/route.ts:163-204`, `src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts:77-120`, `src/app/api/workspaces/[workspaceId]/sources/route.ts:140-151`)

This is good product logic, but it should not be scattered across unrelated handlers.

**Rebuild implication:** create a dedicated monetization domain with:

- subscription service
- entitlement policy service
- usage metering service
- payment webhook processor
- identity verification service

### 4.7 Security posture is mixed

Positive signs:

- storage client access is disabled (`storage.rules:1-8`)
- Firestore rules exist for major collections (`firestore.rules:31-123`)
- Vercel security headers are configured (`vercel.json:4-65`)
- webhook dedupe and timestamp validation exist (`src/app/api/payments/webhook/route.ts:21-24`, `src/app/api/payments/webhook/route.ts:94-135`)

Weak spots:

- Firestore membership rules assume document IDs of `uid_workspaceId`, while server code queries arbitrary docs by fields; this mismatch increases cognitive complexity and may hide authorization edge cases (`firestore.rules:19-29`, `src/app/api/workspaces/[workspaceId]/route.ts:76-96`)
- middleware performs a fetch to session validation on protected requests, which adds latency and more failure paths (`src/middleware.ts:10-23`, `src/middleware.ts:29-45`)
- Docker healthcheck expects `/api/health`, but no such route was found in the audited API tree (`Dockerfile:50-54`, `/tmp/forge_shell_stdout_tK94Km.txt:1-219`)

**Rebuild implication:** security and operability need to be first-class architecture concerns, not cleanup work.

### 4.8 Testing coverage is far too thin for the current surface area

Current observed automated tests are only:

- session cookie parsing (`src/shared/lib/auth/session-cookie.test.ts:1-38`)
- Paystack webhook helper parsing (`src/shared/lib/paystack/webhook-helpers.test.ts:1-61`)

But the product surface spans auth, workspace permissions, uploads, tutoring, RAG, analytics, study plans, subscriptions, exports, admin verification, and collaboration (`/tmp/forge_shell_stdout_tK94Km.txt:1-219`).

**Rebuild implication:** the new app must be built test-first for core domain rules.

---

## 5. Canonical rebuild goals

The rebuild should optimize for the following, in order:

1. **Correctness** — consistent business rules, predictable APIs, explicit data contracts
2. **Maintainability** — small modules, composable services, strict boundaries
3. **Operational safety** — retries, background jobs, observability, idempotency
4. **Performance** — fast initial render, stable streaming, bounded query costs
5. **Security** — principle of least privilege, signed file access, strong policy enforcement
6. **Product velocity** — a codebase that can add new learning modes without architectural collapse
7. **Premium UX** — preserve the product ambition in the redesign blueprint (`Frontend Redesign Blueprint:14-118`, `Frontend Redesign Blueprint:219-257`)

---

## 6. Recommended target architecture

## 6.1 Architecture choice

**Recommendation:** keep a single Next.js monorepo for product delivery speed, but rebuild the internals as a modular application with strict domain and infrastructure boundaries.

### 6.1.1 Proposed top-level structure

```text
src/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (app)/
│   └── api/
├── domains/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── sources/
│   ├── tutoring/
│   ├── flashcards/
│   ├── quizzes/
│   ├── study-plans/
│   ├── analytics/
│   ├── billing/
│   ├── identity/
│   └── exports/
├── features/
├── widgets/
├── shared/
└── jobs/
```

### 6.1.2 Dependency rule

- `app` may import `features`, `widgets`, `domains`, `shared`
- `features` may import `domains` and `shared`
- `domains` may import `shared`
- `shared` imports nothing app-specific
- `jobs` may import `domains` and infrastructure adapters only

This is a stronger version of the intent already documented in the redesign blueprint (`Frontend Redesign Blueprint:122-161`) and partially followed in the current pages (`src/app/dashboard/page.tsx:3-23`).

## 6.2 Backend layering inside each domain

Every major domain should follow this internal shape:

```text
domains/workspaces/
├── contracts/
├── entities/
├── policies/
├── repositories/
├── services/
├── use-cases/
└── mappers/
```

### 6.2.1 Layer responsibilities

- **contracts**: Zod schemas, DTOs, API request/response models
- **entities**: domain objects and invariants
- **policies**: access control and entitlement logic
- **repositories**: Firestore or storage persistence adapters
- **services**: integrations like AI, Paystack, vector store, file parsing
- **use-cases**: business workflows
- **mappers**: persistence ↔ domain ↔ API transformations

### 6.2.2 Route handlers become thin

A route handler should do only this:

1. authenticate session
2. validate input schema
3. call one use case
4. map the result to response
5. log and normalize errors

This replaces the current “all logic in route.ts” pattern seen in tutor, workspace, flashcard generation, and source upload routes (`src/app/api/chat/tutor/route.ts:149-260`, `src/app/api/workspaces/[workspaceId]/route.ts:125-207`, `src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts:45-185`, `src/app/api/workspaces/[workspaceId]/sources/route.ts:127-254`).

## 6.3 Async job architecture

The rebuild must introduce a real job system for operations that should not live inside request/response cycles.

### 6.3.1 Jobs that must be asynchronous

1. source text extraction
2. chunking and embedding generation
3. vector upserts and re-indexing
4. large flashcard or quiz generation batches
5. export generation (PDF, Anki)
6. analytics materialization
7. digest or reminder notifications
8. verification media review workflow handoff

### 6.3.2 Suggested implementation

Because the repo already has Firebase functions configured (`firebase.json:1-15`), the most pragmatic rebuild option is:

- Next.js handles interactive web routes
- Firebase/Cloud Functions or scheduled jobs handle background processing
- Firestore stores job status and progress
- the UI polls or subscribes to job state

### 6.3.3 Job lifecycle model

Each job record should contain:

- `job_id`
- `job_type`
- `status` (`queued | running | completed | failed | cancelled`)
- `workspace_id`
- `source_id` or domain aggregate id
- `attempt_count`
- `last_error`
- `created_at`
- `started_at`
- `completed_at`
- `idempotency_key`

---

## 7. Recommended canonical data model

The rebuild needs a **single canonical schema**. The current docs and code diverge too much (`PRD.md:166-347`, `SSD.md:169-260`, `src/shared/types/database.ts:17-260`).

## 7.1 Naming decision

**Recommendation:** use `snake_case` in Firestore documents and API payloads only where it already maps well to current persistence, but use **camelCase** in internal TypeScript domain models.

This gives:

- a stable persistence layer for Firebase
- ergonomic TypeScript within the app
- clean mapping boundaries

If the team wants complete consistency, choose one style and enforce it everywhere. What must not continue is today’s half-mixed model.

## 7.2 Canonical collections

### 7.2.1 users

Keep and normalize:

- profile
- academic metadata
- plan/subscription state
- verification state
- feature preferences
- audit timestamps

Current related fields already exist across docs and code (`PRD.md:173-187`, `SSD.md:178-192`, `src/shared/lib/paystack/db.ts:8-26`, `src/shared/lib/paystack/db.ts:93-107`).

### 7.2.2 workspaces

Canonical fields:

- `workspace_id`
- `owner_user_id`
- `name`
- `description`
- `course_code`
- `institution`
- `tutor_personality`
- `tutor_custom_instructions`
- `visibility`
- `last_accessed_at`
- `created_at`
- `updated_at`
- `archived_at`

**Key change:** stop using generic `user_id` for ownership in workspace documents. Use `owner_user_id` explicitly.

### 7.2.3 workspace_members

Canonical fields:

- `membership_id`
- `workspace_id`
- `user_id`
- `role`
- `status`
- `invited_by_user_id`
- `joined_at`
- `created_at`
- `updated_at`

**Key change:** make the document ID strategy explicit and consistent with rules and queries. Today rules imply a composed ID but server logic queries arbitrary docs by fields (`firestore.rules:19-29`, `src/app/api/workspaces/[workspaceId]/route.ts:76-96`).

### 7.2.4 sources

Canonical fields:

- `source_id`
- `workspace_id`
- `uploaded_by_user_id`
- `source_type`
- `file_name`
- `storage_path`
- `mime_type`
- `file_size_bytes`
- `checksum`
- `processing_status`
- `embedding_status`
- `processing_error`
- `page_count`
- `chunk_count`
- `created_at`
- `updated_at`

**Key change:** treat file URL as derived, not canonical. Store path, not permanent public URL.

### 7.2.5 source_chunks

Introduce a first-class Firestore collection or subcollection for chunk metadata:

- `chunk_id`
- `source_id`
- `workspace_id`
- `chunk_index`
- `content_preview`
- `char_count`
- `token_count`
- `page_number`
- `section_title`
- `embedding_vector_id`
- `created_at`

**Key change:** do not treat the vector store as the only durable source of chunk-level intelligence.

### 7.2.6 tutor_threads and tutor_messages

The current app writes messages to `tutor_messages` during streaming (`src/app/api/chat/tutor/route.ts:238-247`, `src/app/api/chat/tutor/route.ts:254-260`). The rebuild should normalize this into:

- `tutor_threads`
- `tutor_messages`
- `message_citations`

This avoids oversized message arrays or ad hoc message persistence models.

### 7.2.7 flashcard_decks, flashcards, flashcard_reviews

The current flashcards collection mixes content and spaced repetition state (`src/shared/types/database.ts:62-76`, `src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts:147-167`).

Recommended split:

- `flashcard_decks`
- `flashcards`
- `flashcard_reviews`
- derived review queue per user/workspace

This supports collaboration, auditability, and richer review history.

### 7.2.8 quizzes, quiz_questions, quiz_attempts, quiz_answers

The current quiz structure stores whole question sets inside quiz documents (`src/shared/types/database.ts:78-104`, `src/app/api/workspaces/[workspaceId]/quiz/generate/route.ts:128-163`).

Recommended split:

- `quizzes`
- `quiz_questions`
- `quiz_attempts`
- `quiz_attempt_answers`

This improves analytics, reuse, and partial loading.

### 7.2.9 study_plans, study_plan_sessions, exam_dates

The current study-plan area exists in route structure but should become a first-class planning domain (`/tmp/forge_shell_stdout_tK94Km.txt:216-219` and API tree tail read in session).

### 7.2.10 subscriptions, payments, usage_counters, processed_webhooks

This already conceptually exists in code (`src/shared/lib/paystack/db.ts:28-59`, `src/app/api/payments/webhook/route.ts:112-135`). Keep it, but normalize it into dedicated collections with clear retention and audit rules.

## 7.3 Required Firestore indexes and constraints

The rebuild should define indexes up front for:

- workspaces by owner and last access
- membership lookups by workspace and user
- sources by workspace and processing status
- tutor threads by workspace and updated time
- flashcards by workspace and next review date
- quizzes and attempts by workspace/user
- payments by user and created date
- processed webhooks by expiry

## 7.4 Data model rules

1. every collection gets `created_at` and `updated_at`
2. soft-delete where recovery matters
3. explicit ownership fields
4. explicit role and status fields
5. avoid “one huge document with nested arrays” for high-churn data
6. all timestamps are server-generated
7. all public/private visibility is explicit

---

## 8. API rebuild plan

## 8.1 API design principles

1. version the API from day one (`/api/v1/...`)
2. every route has a Zod request and response contract
3. every route returns a standard success/error envelope
4. route handlers never directly embed business rules
5. entitlements and authorization are resolved centrally
6. long-running operations return job objects

## 8.2 Proposed API domain map

### 8.2.1 auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/signup`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/refresh`

### 8.2.2 users and profile

- `GET /api/v1/me`
- `PATCH /api/v1/me`
- `PATCH /api/v1/me/preferences`
- `DELETE /api/v1/me`

### 8.2.3 workspaces

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/:id`
- `PATCH /api/v1/workspaces/:id`
- `DELETE /api/v1/workspaces/:id`

### 8.2.4 members and invites

- `GET /api/v1/workspaces/:id/members`
- `POST /api/v1/workspaces/:id/invites`
- `PATCH /api/v1/workspaces/:id/members/:memberId`
- `DELETE /api/v1/workspaces/:id/members/:memberId`
- `POST /api/v1/invites/:token/accept`

### 8.2.5 sources and ingestion

- `GET /api/v1/workspaces/:id/sources`
- `POST /api/v1/workspaces/:id/sources/upload-url`
- `POST /api/v1/workspaces/:id/sources`
- `GET /api/v1/sources/:id`
- `DELETE /api/v1/sources/:id`
- `POST /api/v1/sources/:id/reprocess`
- `GET /api/v1/jobs/:jobId`

### 8.2.6 tutoring

- `POST /api/v1/workspaces/:id/tutor/messages`
- `GET /api/v1/workspaces/:id/tutor/threads`
- `GET /api/v1/tutor/threads/:threadId/messages`
- `PATCH /api/v1/tutor/threads/:threadId`

### 8.2.7 flashcards

- `GET /api/v1/workspaces/:id/flashcards`
- `POST /api/v1/workspaces/:id/flashcards/generate`
- `POST /api/v1/flashcards/:id/review`
- `POST /api/v1/workspaces/:id/flashcards`
- `PATCH /api/v1/flashcards/:id`
- `DELETE /api/v1/flashcards/:id`

### 8.2.8 quizzes

- `GET /api/v1/workspaces/:id/quizzes`
- `POST /api/v1/workspaces/:id/quizzes/generate`
- `GET /api/v1/quizzes/:id`
- `POST /api/v1/quizzes/:id/attempts`
- `POST /api/v1/quizzes/:id/submit`

### 8.2.9 study plans

- `GET /api/v1/workspaces/:id/study-plan`
- `POST /api/v1/workspaces/:id/study-plan/generate`
- `POST /api/v1/workspaces/:id/exams`
- `POST /api/v1/workspaces/:id/sessions`
- `PATCH /api/v1/sessions/:id/complete`

### 8.2.10 analytics

- `GET /api/v1/analytics/global`
- `GET /api/v1/workspaces/:id/analytics`
- `GET /api/v1/workspaces/:id/streak`
- `GET /api/v1/workspaces/:id/progress`

### 8.2.11 billing and identity

- `GET /api/v1/billing/plans`
- `POST /api/v1/billing/checkout`
- `GET /api/v1/billing/subscription`
- `GET /api/v1/billing/history`
- `POST /api/v1/billing/webhook`
- `POST /api/v1/identity/verify`
- `GET /api/v1/admin/verifications`
- `PATCH /api/v1/admin/verifications/:id`

## 8.3 API standards

Every API contract should define:

- auth requirement
- required role
- subscription requirement
- quota behavior
- idempotency strategy
- error codes
- pagination scheme
- cacheability

---

## 9. Frontend rebuild plan

## 9.1 UI architecture

The redesign blueprint is strong and should be treated as the visual north star (`Frontend Redesign Blueprint:14-118`, `Frontend Redesign Blueprint:219-257`).

### 9.1.1 Route groups

Use three primary route groups:

- `(marketing)` for landing, pricing, docs-lite pages
- `(auth)` for login/signup/onboarding
- `(app)` for all authenticated product flows

### 9.1.2 Shells

Use two shells:

1. **AppShell** for global navigation, workspace switching, command palette, account access
2. **WorkspaceShell** for workspace-local tabs: overview, sources, tutor, flashcards, quizzes, analytics, study plan

This formalizes the current shell concept already present in code and blueprint (`src/widgets/AppShell/AppShell.tsx:1-27`, `Frontend Redesign Blueprint:219-241`).

## 9.2 State model

### 9.2.1 Server state

Use TanStack Query for all remote data. The dashboard layout already installs the provider (`src/app/dashboard/layout.tsx:26-37`, `src/app/dashboard/layout.tsx:95-104`). Keep that pattern.

### 9.2.2 Client state

Use Zustand only for:

- UI state
- panel open/close state
- active filters
- command palette
- transient interaction state

### 9.2.3 Auth state

Move away from a giant all-purpose context (`src/context/AuthContext.tsx:32-45`, `src/context/AuthContext.tsx:77-138`). Replace it with:

- `useSession()` for server-backed auth status
- `useViewer()` for current user profile and subscription
- a separate billing/entitlements hook

## 9.3 Component rules

1. pages assemble only
2. features own UI workflows
3. domains own business rules
4. forms use a standard validation stack
5. every async UI gets a skeleton, empty state, and error state
6. streaming UIs must degrade cleanly

## 9.4 Accessibility and mobile standards

Required standards for the rebuild:

- keyboard navigation for major flows
- command palette accessibility
- screen-reader labels on uploads, tutor controls, flashcard review
- touch-friendly targets on all mobile screens
- no hidden functionality behind hover-only interactions

## 9.5 Performance standards

Targets should align with the blueprint and exceed the current page composition quality:

- LCP < 2.5s on dashboard and landing
- INP < 200ms
- CLS < 0.1
- streaming tutor response starts within 1s after server accept
- source list virtualization when large
- code-split charts, exports, and heavy AI interfaces (`Frontend Redesign Blueprint:204-216`)

---

## 10. Domain-by-domain rebuild requirements

## 10.1 Authentication and onboarding

### Scope

- email/password signup/login
- Google login
- session establishment
- onboarding profile setup
- initial workspace creation path

### Rebuild rules

- server session cookie is the authority
- middleware should perform minimal, deterministic checks
- profile bootstrap happens once after signup, not ad hoc in unrelated routes
- user creation and subscription bootstrap are idempotent

### Exit criteria

- no duplicated auth state sources
- all protected routes resolve correctly without client-side flicker
- login and logout flows are test-covered

## 10.2 Workspaces

### Scope

- create, list, update, archive, delete
- ownership, visibility, switching
- dashboard summaries

### Rebuild rules

- workspace ownership uses explicit `owner_user_id`
- membership and visibility are resolved by a policy layer
- list endpoints are paginated and indexed
- aggregates like source count and due flashcards are materialized or cached when needed

### Exit criteria

- one use case per mutation
- full access-control test coverage
- no handler recomputes everything from raw collections on every request unless intentionally small

## 10.3 Sources and ingestion

### Scope

- upload URL generation
- file validation
- private storage
- extraction
- chunking
- embeddings
- reprocessing

### Rebuild rules

- uploads use signed URLs or privileged server upload flow
- storage path is canonical; access uses signed read URLs
- ingestion is async and job-backed
- chunk generation is idempotent by source version or checksum
- processing status is visible in UI

### Exit criteria

- upload success never depends on internal route self-fetching
- failed jobs are retryable
- source deletion also deletes associated chunks/vectors safely

## 10.4 Tutor

### Scope

- tutor threads
- personalities
- citations
- streaming responses
- quota checks
- context retrieval

### Rebuild rules

- AI provider must be abstracted behind an interface
- prompt construction is versioned and testable
- citations are structured objects, not encoded control strings appended into output streams
- thread persistence is normalized
- quota and entitlement checks happen before model invocation

### Exit criteria

- thread creation, continuation, and citation rendering are reliable
- source citation UI can open the exact referenced document/page
- conversation storage does not depend on fragile streaming side effects

## 10.5 Flashcards

### Scope

- manual creation
- AI generation
- deck browsing
- spaced repetition review
- export

### Rebuild rules

- generation can target job mode for large batches
- review events are append-only records
- next review scheduling is derived from reviews, not hidden mutation magic
- free-tier limits are enforced centrally

### Exit criteria

- review queue correctness is unit-tested
- deck performance stays acceptable at high card counts
- export works from canonical card data

## 10.6 Quizzes and exams

### Scope

- quiz generation
- attempt taking
- scoring
- feedback explanations
- timed mode / exam simulation

### Rebuild rules

- question bank structure is normalized
- attempts are immutable once submitted
- timer handling is server-verifiable for exam mode if cheating concerns matter
- question explanations and answer analytics are preserved for review screens

### Exit criteria

- quiz generation and submission paths are contract-tested
- analytics can consume attempt data without custom parsing logic

## 10.7 Study plans

### Scope

- exam dates
- study sessions
- AI-generated plans
- countdown and calendar view

### Rebuild rules

- plans are explicit entities, not just UI projections
- generated plans can be edited manually
- progress completion updates analytics and streaks through domain events

### Exit criteria

- calendar views are driven by stable APIs
- session completion updates are idempotent

## 10.8 Analytics

### Scope

- streaks
- progress summaries
- workspace performance
- review and quiz trends

### Rebuild rules

- avoid computing complex analytics directly in request handlers for every page view
- materialize expensive aggregates on event or on schedule
- define one analytics vocabulary used across product and billing

### Exit criteria

- dashboard analytics remain fast under scale
- every metric shown to users has a clear source of truth

## 10.9 Billing and verification

### Scope

- plans
- checkout
- trial activation
- subscription state
- webhook processing
- payment history
- student verification

### Rebuild rules

- payment records are immutable except status transitions
- webhook processor is idempotent and observable
- verification workflow has clear states and admin actions
- entitlements come from a central service, not route duplication

### Exit criteria

- subscription status changes are traceable and test-covered
- quotas update correctly across free and paid plans

---

## 11. AI and RAG rebuild strategy

## 11.1 Provider abstraction

The current code still names the module `openai` while using Gemini (`src/shared/lib/openai/client.ts:1-33`). The rebuild should fix this by introducing a provider-neutral interface:

- `TextGenerationProvider`
- `EmbeddingProvider`
- `StreamingChatProvider`
- `StructuredGenerationProvider`

This makes vendor changes low-risk.

## 11.2 Prompting architecture

Prompts should be:

- versioned
- stored by domain
- testable with snapshot or schema assertions
- separate from route handlers

## 11.3 Retrieval architecture

Recommended retrieval pipeline:

1. generate query embedding
2. retrieve top semantic matches
3. apply metadata filters
4. optional rerank
5. construct citations from canonical chunk records
6. assemble prompt window with token budget control

The current retriever already approximates this (`src/shared/lib/rag/retriever.ts:25-60`, `src/shared/lib/rag/retriever.ts:170-260`), but the rebuild should make it more explicit and traceable.

## 11.4 AI safety and robustness

Required controls:

- upload validation and parsing limits
- moderation or abuse heuristics where needed
- retry and timeout policy per AI task type
- structured output parsing with fallbacks
- cost guardrails per plan and per endpoint
- prompt and completion logging redaction policy

---

## 12. Security, privacy, and compliance plan

## 12.1 Auth and authorization

- session cookies must be secure, httpOnly, and server-validated
- route guards must not duplicate business authorization
- workspace and admin policies live in reusable policy modules

## 12.2 Storage and file access

- uploaded files remain private by default
- access uses short-lived signed URLs
- checksums prevent duplicate processing issues
- malware/unsafe file heuristics should be considered for public launch

## 12.3 Secrets and environments

- all provider keys server-side only
- separate envs for local, preview, staging, production
- per-environment Firebase projects where possible

## 12.4 Data privacy

- publish retention rules for tutor chats, uploads, and payment records
- define deletion behavior for account deletion
- define export behavior for user-owned learning content

## 12.5 Webhook and payment safety

Preserve and improve the existing good work around:

- signature validation
- timestamp window checks
- dedupe keys
- processed webhook retention (`src/app/api/payments/webhook/route.ts:76-135`)

---

## 13. Testing strategy for the rebuild

## 13.1 Test pyramid

### Unit tests

For:

- policies
- quota calculations
- spaced repetition scheduling
- prompt builders
- mapper logic
- session parsing
- webhook helper parsing

### Integration tests

For:

- auth session lifecycle
- workspace access rules
- source upload lifecycle
- tutor thread persistence
- flashcard review updates
- webhook processing

### Contract tests

For every public API route:

- request schema validation
- success response shape
- error response shape
- auth failures
- entitlement failures

### End-to-end tests

Must cover:

1. signup → create workspace → upload source → ask tutor
2. generate flashcards → review queue → analytics update
3. generate quiz → submit attempt → review explanations
4. hit free limit → upgrade → gain access
5. submit verification → admin approves/rejects

## 13.2 Tooling recommendation

- Vitest for unit and integration tests
- Playwright for e2e
- MSW or equivalent for client-side API mocking where needed
- seeded Firebase emulator or isolated test project for integration suites

## 13.3 Quality gates

No merge should be allowed unless:

- type check passes
- lint passes
- unit tests pass
- core integration suite passes
- smoke e2e passes on preview

---

## 14. Observability and operability plan

## 14.1 Logging

Introduce structured logs for:

- auth failures
- permission denials
- upload lifecycle events
- job lifecycle changes
- AI request outcomes
- payment webhook outcomes
- export generation outcomes

## 14.2 Monitoring

Track:

- request latency by route
- tutor stream success rate
- upload success/failure rate
- processing queue time
- embedding failure rate
- payment conversion funnel
- daily active users and session duration

## 14.3 Error tracking

The SSD calls for monitoring, but the current app does not show a mature error tracking layer in the audited routes (`SSD.md:3826-3845`). The rebuild should add a real error-tracking stack for both client and server.

## 14.4 Health endpoints

The Docker image expects `/api/health`, but that route was not found during audit (`Dockerfile:50-54`, `/tmp/forge_shell_stdout_tK94Km.txt:1-219`). The rebuild must include:

- `/api/health/live`
- `/api/health/ready`
- dependency checks for Firestore, storage, vector provider, and AI provider

---

## 15. Deployment and infrastructure plan

## 15.1 Hosting decision

Choose one primary deployment story first.

### Recommendation

- **Primary:** Vercel for the Next.js app
- **Supporting compute:** Firebase/Cloud Functions for async jobs if needed
- **Optional secondary:** Docker only if self-hosting or ECS remains a real requirement

The current repo supports both Vercel and Docker, but the two paths are not fully aligned (`vercel.json:1-69`, `Dockerfile:1-54`, `next.config.js:11-16`).

## 15.2 Environment layout

Minimum environments:

- local
- preview
- staging
- production

Each environment should define:

- Firebase project
- storage bucket
- AI provider keys
- vector index/namespace config
- Paystack keys and webhook secrets

## 15.3 CI/CD pipeline

Pipeline stages:

1. install
2. lint
3. type-check
4. unit tests
5. integration tests
6. build
7. preview deploy
8. smoke e2e
9. promote to production

## 15.4 Infrastructure requirements checklist

- health endpoints
- signed storage access
- Firestore indexes committed
- webhook secrets configured
- background job retries configured
- observability credentials configured
- environment variable validation on boot

---

## 16. Recommended phased delivery roadmap

## Phase 0 — Discovery and architecture lock

**Duration:** 4-6 days

### Deliverables

- canonical architecture spec
- canonical data model
- API contract map
- environment matrix
- design token and layout decisions
- prioritized MVP scope freeze

### Exit criteria

- no unresolved conflict between PRD, SSD, and codebase assumptions
- every domain has an owner and scope boundary

## Phase 1 — Foundation platform

**Duration:** 1-2 weeks

### Deliverables

- new repo structure
- auth/session foundation
- viewer/profile model
- shared API response contracts
- logging/error framework
- CI pipeline
- health endpoints

### Exit criteria

- user can sign up, log in, and access protected shell reliably

## Phase 2 — Workspaces and sources

**Duration:** 1-2 weeks

### Deliverables

- workspace CRUD
- membership model
- source upload flow
- background processing jobs
- processing status UI

### Exit criteria

- user can create workspace and upload/process study material end-to-end

## Phase 3 — Tutor and retrieval

**Duration:** 1-2 weeks

### Deliverables

- tutor threads/messages
- retrieval pipeline
- streaming responses
- citations UI
- quota and entitlement enforcement

### Exit criteria

- user can ask grounded questions against workspace sources with stable citations

## Phase 4 — Flashcards and quizzes

**Duration:** 1-2 weeks

### Deliverables

- AI flashcard generation
- review queue and spaced repetition
- quiz generation and attempts
- review history

### Exit criteria

- user can generate, study, and review content from a workspace end-to-end

## Phase 5 — Study planning and analytics

**Duration:** 1-2 weeks

### Deliverables

- study plan generation and editing
- exam/session scheduling
- streaks and progress analytics
- global dashboard summaries

### Exit criteria

- study activity updates visible analytics correctly

## Phase 6 — Billing, verification, and exports

**Duration:** 1-2 weeks

### Deliverables

- checkout and subscription state
- webhook processor
- verification flow
- export to PDF/Anki
- premium entitlement UX

### Exit criteria

- free/paid plan transitions and gated features behave correctly

## Phase 7 — Hardening and launch readiness

**Duration:** 1 week

### Deliverables

- performance tuning
- security review
- e2e test expansion
- admin tooling polish
- data migration tools
- launch checklist

### Exit criteria

- platform is observable, recoverable, and launch-safe

---

## 17. MVP scope recommendation for the rebuild

To avoid rebuilding the same fragility, the new MVP should intentionally focus on the smallest complete loop:

1. signup/login
2. profile bootstrap
3. create workspace
4. upload and process sources
5. ask tutor grounded questions
6. generate flashcards
7. review flashcards
8. generate quiz
9. submit quiz
10. upgrade via Paystack

Everything else can come after this core loop is stable.

### Post-MVP but planned

- collaboration invites and shared workspaces
- WhatsApp sharing
- PDF/Anki export
- advanced analytics
- offline mode depth
- concept maps
- voice tutor

This still preserves the PRD ambition, but avoids rebuilding too much simultaneously (`PRD.md:134-145`, `PRD.md:568-589`).

---

## 18. Migration strategy from the current app

## 18.1 Rebuild alongside the existing app

Do **not** rewrite in place.

Recommended approach:

- keep current app as legacy production branch
- build new app in parallel behind a feature flag or separate app route group/repo branch
- migrate only validated domains into the new system

## 18.2 Data migration order

1. users
2. subscriptions and payment history
3. workspaces
4. memberships
5. sources metadata
6. tutor threads/messages if worth preserving
7. flashcards/quizzes/study plans
8. analytics snapshots if needed

## 18.3 Migration rules

- do not migrate broken or inconsistent derived data blindly
- reprocess sources where chunk/vector quality is uncertain
- preserve immutable payment records carefully
- backfill ownership and membership explicitly

## 18.4 Cutover strategy

- internal alpha on staging
- invite-only beta for trusted users
- migrate a subset of production users
- full production cutover only after parity on the core learning loop

---

## 19. Delivery governance

## 19.1 Required documents before coding starts

1. final scope and roadmap
2. canonical schema document
3. API contract reference
4. design system token sheet
5. environment and secrets matrix
6. test strategy checklist

## 19.2 Definition of done for each domain

A domain is not done until it has:

- UI implemented
- API contracts implemented
- access control implemented
- happy path tested
- failure states tested
- logs and metrics added
- empty/loading/error states complete
- documentation in code comments or internal architecture notes as needed

## 19.3 Release readiness checklist

Before launch:

- all core flows pass e2e
- health endpoints live
- payment webhook tested in real preview env
- signed file access tested
- rate limits and quotas verified
- backup and rollback process documented
- support/admin visibility in place

---

## 20. Immediate decisions needed before implementation starts

These decisions should be locked before the rebuild begins:

1. **Canonical AI provider model:** Gemini-only, OpenAI-only, or provider abstraction by design
2. **Canonical ownership naming:** `owner_user_id` vs `user_id`
3. **Primary deployment target:** Vercel-first only, or Vercel + Firebase jobs
4. **Storage access model:** signed URLs only vs server proxy downloads
5. **MVP scope freeze:** which PRD features are deferred until after core stability
6. **Migration stance:** preserve old tutor/flashcard history or regenerate from source data
7. **Testing minimums:** what blocks release vs what is post-launch hardening

---

## 21. Final recommendation

Yes, rebuilding from the ground up is justified.

The current app already contains strong product thinking, a promising visual direction, a partially correct feature-sliced structure, and meaningful domain coverage. The problem is not lack of effort. The problem is that too much critical behavior currently lives in large client pages, broad route handlers, duplicated auth logic, and loosely standardized data contracts (`src/app/dashboard/settings/page.tsx:1-255`, `src/context/AuthContext.tsx:77-138`, `src/app/api/chat/tutor/route.ts:149-260`, `src/app/api/workspaces/[workspaceId]/route.ts:125-207`).

The rebuild should therefore preserve:

- the product concept
- the design ambition
- the domain surface
- the monetization model

But it should replace:

- the execution architecture
- the domain boundaries
- the data model inconsistencies
- the long-running request patterns
- the current level of test coverage

If this plan is followed, the next version of Exam-Killer can be both more robust and much easier to evolve.

---

## Appendix A — Current implementation facts that strongly influenced this plan

- Root layout initializes dark theme and global providers (`src/app/layout.tsx:12-77`)
- Dashboard layout mounts query client and app shell (`src/app/dashboard/layout.tsx:26-37`, `src/app/dashboard/layout.tsx:95-104`)
- App shell already implements the correct global navigation concept (`src/widgets/AppShell/AppShell.tsx:69-160`, `src/widgets/AppShell/AppShell.tsx:173-210`)
- Middleware currently validates cookies and fetches server validation (`src/middleware.ts:10-45`)
- AuthContext owns login, signup, Google auth, session cookie sync, subscription fetch, and feature gating (`src/context/AuthContext.tsx:53-75`, `src/context/AuthContext.tsx:85-138`, `src/context/AuthContext.tsx:140-254`)
- Tutor route is a large all-in-one workflow (`src/app/api/chat/tutor/route.ts:149-260`)
- Source upload route uses internal fetch to trigger processing (`src/app/api/workspaces/[workspaceId]/sources/route.ts:221-240`)
- Flashcard generation route couples generation, quota checking, and persistence (`src/app/api/workspaces/[workspaceId]/flashcards/generate/route.ts:77-180`)
- Quiz generation route couples generation, scoring model creation, and persistence (`src/app/api/workspaces/[workspaceId]/quiz/generate/route.ts:81-182`)
- Payment webhook route already has useful idempotency concepts worth preserving (`src/app/api/payments/webhook/route.ts:112-135`)
- Firestore rules and server access patterns are not fully harmonized (`firestore.rules:19-29`, `src/app/api/workspaces/[workspaceId]/route.ts:76-96`)
- Docker expects a health endpoint not currently present in the audited route tree (`Dockerfile:50-54`, `/tmp/forge_shell_stdout_tK94Km.txt:1-219`)
- Observed automated tests are minimal for the app’s scope (`src/shared/lib/auth/session-cookie.test.ts:1-38`, `src/shared/lib/paystack/webhook-helpers.test.ts:1-61`)
