# Production Readiness Audit Report: Exam-Killer

**Date:** 2026-03-11  
**Auditor:** Principal Security & Architecture Auditor  
**Status:** COMPLETED

---

## 🚨 CRITICAL (Security & Stability)

### 1. Missing Zod Schema Validation in API Routes

**Vector:** Security & API Hardening  
**Finding:** API routes are using manual `if` checks and unstructured `parseBody<T>` calls instead of the Zod-based validation prescribed in the Redesign Blueprint §3.2. This increases risk of malformed data entry and reduces type safety at the network boundary.

- **[route.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/app/api/chat/tutor/route.ts#L36-L51)**: Manual validation of `workspaceId` and `message`.
- **[route.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/app/api/workspaces/route.ts#L83-L113)**: Manual validation for workspace creation; lacks strict schema enforcement for optional fields.
- **[auth.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/lib/api/auth.ts#L201-L221)**: Standard `parseBody` and `validateRequiredFields` helpers do not support schema validation.

### 2. Leaky Abstraction: Business Logic in Global Stores

**Vector:** Architecture & FSD Compliance  
**Finding:** The `chat-store` contains direct API interaction logic (`sendMessage`), violating the FSD principle where primary business logic resides in the `features/` layer (Blueprint §2.2). This makes the logic harder to test and reuse across different feature contexts.

- **[chat-store.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/store/chat-store.ts#L78-L144)**: `sendMessage` implementation includes an `await fetch` call.

---

## ⚠️ WARNING (Architecture & Error Handling)

### 3. FSD Layer Violation: Improper 'shared' Structure

**Vector:** Architecture & FSD Compliance  
**Finding:** Major shared directories (`hooks`, `lib`, `store`, `types`) are located at the `src/` root instead of within `src/shared/`. This violates the structural integrity of Feature-Sliced Design which requires a dedicated `shared/` layer (Blueprint §2.1).

- **Paths affected:** `src/hooks`, `src/lib`, `src/store`, `src/types`.

### 4. Server State in Zustand

**Vector:** Architecture & FSD Compliance  
**Finding:** Remote server data (chat messages) is being stored and managed in a global Zustand store. The Blueprint (§2.3) explicitly forbids this, requiring TanStack Query as the single source of truth for all server state.

- **[chat-store.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/store/chat-store.ts#L22)**: `messages` array managed by Zustand.

### 5. Missing UI Feedback (Toasts) in Mutations

**Vector:** Error Handling & Edge Cases  
**Finding:** TanStack Query mutations lack integrated toast notifications on `onSuccess` or `onError`. While optimistic updates are implemented, the final outcome of asynchronous operations is not explicitly communicated to the user via the UI.

- **[useWorkspaces.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/features/workspace/model/useWorkspaces.ts#L88)**: `onSuccess` only invalidates queries.
- **[useSources.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/features/sources/model/useSources.ts#L82)**: Missing success/error toasts for source uploads.

### 6. Misplaced/Legacy Components

**Vector:** Architecture & FSD Compliance  
**Finding:** The `src/components/` directory exists and contains domain-specific logic (e.g., `chat`, `flashcards`, `quiz`), creating ambiguity between correctly architected `features/` and legacy components.

- **Path affected:** `src/components/`

---

## 💡 OPTIMIZATION (Performance & Cleanliness)

### 7. Performance: Heavy Component Lazy Loading

**Vector:** Performance & React Anti-Patterns  
**Finding:** While `next/dynamic` is effectively used in page shells, internal component compositions within `widgets/` (like `AppShell`) could benefit from more aggressive code splitting if they grow in complexity.

- **[AppShell.tsx](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/widgets/AppShell/AppShell.tsx)**: Standard imports for `SidebarNav` and `CommandPalette` prevent them from being split unless the parent is dynamic.

### 8. Input Validation Helper Refactoring

**Vector:** Security & API Hardening  
**Finding:** Transitioning from `validateRequiredFields` to a unified `withZodAuth` or similar wrapper would drastically simplify API route handlers and improve security.

- **[auth.ts](file:///C:/Projects/ApplicationDevelopment/Exam-Killer/src/lib/api/auth.ts#L213-L221)**: Recommendation to deprecate in favor of Zod.
