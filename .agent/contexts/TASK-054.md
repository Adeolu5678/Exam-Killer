# TASK-054 — Pre-Production Audit: Auth Flow, Session & Firestore Security

**Priority**: P0 🔴 CRITICAL
**Status**: ⬚ PENDING
**Dependencies**: None (can run in parallel with TASK-052 and TASK-053)

---

## Objective

Audit the authentication flow and Firestore security rules for production-breaking
vulnerabilities. These are the bugs that let users into each other's data or lock them
out entirely.

---

## Area 1: Auth Session Cookie

Check `src/app/api/auth/session/route.ts` and `src/shared/lib/api/auth.ts`:

1. **Session expiry handling** — when the Firebase ID token expires (1 hour), does the
   client get a `401` with a message it can handle (redirect to login), or does it get
   a vague 500?
2. **Cookie `httpOnly` + `secure` flags** — confirm the session cookie is set with
   `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'strict'`.
3. **`withAuth` middleware** — if the token is absent entirely (cold page load with no
   cookie), does `withAuth` return `401` cleanly or does it throw?

---

## Area 2: Ownership Checks Consistency

Every route that reads/writes workspace-scoped data must verify the requesting user owns
the workspace. Run:

```powershell
Select-String -Path "src/app/api/**/*.ts" -Pattern "withOwnership" -Recurse
```

Then cross-reference with routes that accept a `workspaceId` param but do NOT call
`withOwnership`. Any unprotected route is a P0 data leak.

Common culprit pattern — routes that do:

```typescript
const workspaceId = params.workspaceId;
const doc = await db.collection('workspaces').doc(workspaceId).get();
// Then proceed without checking doc.data().user_id === userId
```

Fix: wrap with `withOwnership` or add an explicit ownership assertion.

---

## Area 3: Firestore Rules

Read `firestore.rules`. Verify:

1. All user-owned collections (`workspaces`, `flashcards`, `quizzes`, `sources`,
   `study_sessions`, `exam_dates`) only allow `request.auth.uid == resource.data.user_id`.
2. No collection has `allow read, write: if true;` (open rules).
3. The `notebooklm_accounts` and `user_notebooks` collections (added in TASK-040/041)
   should be LOCKED DOWN or ideally have their rules removed now that NLM is gone.
   If those collection rules exist, add `allow read, write: if false;` to block them.

---

## Area 4: Payment Webhook Security

Check `src/app/api/payments/webhook/route.ts`:

1. Is the Paystack webhook signature validated before processing?
   The correct pattern is to compare `x-paystack-signature` header against
   `HMAC-SHA512(rawBody, PAYSTACK_SECRET_KEY)`.
2. If signature validation is missing or bypassed, it's a critical billing vulnerability.
   Document findings and add validation if missing.

---

## Verification

```bash
npx tsc --noEmit
npm run lint
```

Both must pass. Document any security findings in a handoff even if you can't fix all of them in one session. Update task registry: mark TASK-054 ✅ COMPLETED when done.
