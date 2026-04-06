# TASK-052 — Pre-Production Audit: API Routes & Auth Layer

**Priority**: P0 🔴 CRITICAL
**Status**: ⬚ PENDING
**Dependencies**: None

---

## Objective

Audit every backend API route for production-correctness. Focus on three bug categories
that cause real user-facing failures:

1. **`any` type casts** — the `workspace.user_id` ownership check on line 170 of `flashcards/generate/route.ts` uses `(workspace: any)`. Grep and fix all similar patterns.
2. **Dynamic `require()` inside request handlers** — several routes do `require('firebase-admin/firestore').Timestamp.now()` inline. This is a production anti-pattern (synchronous require inside async hot path). Replace with proper static top-level imports.
3. **Missing rate-limit / auth guards** — spot-check that every route that performs AI generation (`flashcards/generate`, `quiz/generate`, `exam/generate`, `study-plan/create`) has subscription-limit checks. Document any missing.
4. **Error response inconsistencies** — ensure every `catch` block returns `errorResponse(...)` not a raw `NextResponse.json(...)`. Grep for `NextResponse.json` outside of the auth helper file.

---

## Files to Audit

All 49 route files under `src/app/api/`. Priority order:

1. `workspaces/[workspaceId]/flashcards/generate/route.ts` (known `any` on line 170)
2. `workspaces/[workspaceId]/quiz/generate/route.ts`
3. `workspaces/[workspaceId]/exam/generate/route.ts`
4. `study-plan/create/route.ts`
5. `chat/tutor/route.ts`
6. All remaining routes

---

## Specific Fixes Required

### Fix 1 — Remove inline `require()`

In any route file where you see:

```typescript
require('firebase-admin/firestore').Timestamp.now();
```

Replace with a static import at the top of the file:

```typescript
import { Timestamp } from 'firebase-admin/firestore';
// then use:
Timestamp.now();
```

### Fix 2 — Remove `any` type in `withOwnership` callbacks

Pattern to find:

```typescript
(workspace: any) => workspace.user_id;
```

Replace with the actual typed shape. The workspace document shape has a `user_id: string` field. Create a minimal inline type:

```typescript
(workspace: Record<string, unknown>) => workspace.user_id as string;
```

or import the `Workspace` type from `@/shared/types/database` if it exists.

### Fix 3 — Audit `NextResponse.json` usage

Run:

```powershell
Select-String -Path "src/app/api/**/*.ts" -Pattern "NextResponse\.json" -Recurse
```

Any matches outside `src/shared/lib/api/auth.ts` should be replaced with the appropriate `successResponse()` or `errorResponse()` helper.

---

## Verification

```bash
npx tsc --noEmit
npm run lint
```

Both must exit code 0. Update task registry: mark TASK-052 ✅ COMPLETED when done.
