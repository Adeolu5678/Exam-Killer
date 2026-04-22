[You are continuing execution work for the Exam-Killer ground-up rebuild.

Authoritative plan file:
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1-1543

Critical execution rules:
1. Treat plans/2026-04-07-ground-up-rebuild-plan-v1.md:1247-1378 as the master phased roadmap.
2. Treat plans/2026-04-07-ground-up-rebuild-plan-v1.md:1382-1409 as the MVP priority.
3. Treat plans/2026-04-07-ground-up-rebuild-plan-v1.md:1413-1448 as the mandatory migration strategy.
4. Treat plans/2026-04-07-ground-up-rebuild-plan-v1.md:1452-1487 as delivery governance and definition-of-done.
5. Always verify the repository directly before making claims.
6. Use and maintain a task list throughout execution.
7. Work sequentially by phase. Do not move ahead unless the current phase is actually complete.
8. Do not rewrite blindly in place; preserve safe phased execution.
9. Every completion report must include:
   - concise implementation summary
   - files changed
   - architectural decisions made
   - tests/build/lint results
   - open risks/blockers
   - exact code references in filepath:startLine-endLine format

Current accepted project status:
- Phase 0 accepted.
- Phase 1 accepted.
- Phase 2 accepted.
- Phase 3 accepted.
- Phase 4 accepted.
- Phase 5 accepted.
- Phase 6 was attempted but is NOT yet accepted.
- Your job is to continue from Phase 6 final closure/remediation only.
- Do NOT start Phase 7 unless Phase 6 is truthfully complete.

Authoritative roadmap slices:
- Phase 6 scope and exit criterion: plans/2026-04-07-ground-up-rebuild-plan-v1.md:1347-1361
- Phase 7 scope (do not begin yet): plans/2026-04-07-ground-up-rebuild-plan-v1.md:1363-1378
- MVP loop anchor: plans/2026-04-07-ground-up-rebuild-plan-v1.md:1382-1409
- Migration rules: plans/2026-04-07-ground-up-rebuild-plan-v1.md:1413-1448
- Definition of done / release readiness: plans/2026-04-07-ground-up-rebuild-plan-v1.md:1452-1487

Accepted earlier rebuild baseline to build on:
- Phase 1 auth/session foundation exists on the rebuild path under /api/v1 auth/me and viewer/session infrastructure.
- Phase 2 workspaces/sources and processing jobs are accepted.
- Phase 3 tutor/retrieval/streaming/citations are accepted.
- Phase 4 flashcards/quizzes/review history are accepted.
- Phase 5 study-plan + analytics are accepted.

Important current Phase 6 context:
The previous auditing agent did NOT accept Phase 6 because the active app behavior was not yet proven coherent enough for the exit criterion:
- “free/paid plan transitions and gated features behave correctly”
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1359-1361

Authoritative audit concerns to resolve:
1. Rebuilt billing / verification / export server routes exist, but active app flow coherence is not yet proven.
2. There is split-path risk between rebuilt and legacy routes:
   - src/app/api/v1/payments/*
   - src/app/api/payments/*
   - src/app/api/v1/export/*
   - src/app/api/export/*
   You must verify which paths the active app actually uses and either align them or report truthfully.
3. Premium entitlement / gating in the active study flow is still not clearly correct.
   Inspect especially:
   - src/features/flashcards/api/flashcardsApi.ts
   - src/app/api/v1/flashcards/[flashcardId]/review/route.ts
   - src/domains/flashcards/services/flashcard-service.ts
   - src/shared/lib/paystack/subscription.ts
   - src/domains/users/contracts/viewer.ts
4. Verification / billing UX needs end-to-end confirmation in the real active surfaces:
   - src/app/dashboard/settings/page.tsx
   - src/app/pricing/page.tsx
   - src/app/payment/callback/page.tsx
   - src/features/identity/VerificationForm.tsx
   - src/features/identity/VerificationBanner.tsx
   - src/app/admin/verifications/page.tsx
   - src/context/AuthContext.tsx
5. Do not claim completion unless free/paid transitions, webhook handling, verification, exports, and premium gating all behave correctly in the active app flow, not just on the server.

Known currently relevant files from the last audit:
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1347-1487
- src/domains/billing/services/billing-service.ts:1-545
- src/app/dashboard/settings/page.tsx:1-1634
- src/features/flashcards/api/flashcardsApi.ts:21-152
- src/app/api/v1/flashcards/[flashcardId]/review/route.ts:13-40

Inspect first:
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1347-1361
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1413-1448
- plans/2026-04-07-ground-up-rebuild-plan-v1.md:1452-1487
- src/domains/billing/contracts/billing.ts
- src/domains/billing/services/billing-service.ts
- src/app/api/v1/payments/initialize/route.ts
- src/app/api/v1/payments/verify/route.ts
- src/app/api/v1/payments/status/route.ts
- src/app/api/v1/payments/history/route.ts
- src/app/api/v1/payments/webhook/route.ts
- src/app/api/v1/verification/submit/route.ts
- src/app/api/v1/verification/admin/route.ts
- src/app/api/v1/verification/check-matric/route.ts
- src/app/api/v1/export/flashcards/pdf/route.ts
- src/app/api/v1/export/flashcards/anki/route.ts
- src/app/api/payments/status/route.ts
- src/app/api/payments/initialize/route.ts
- src/app/api/payments/history/route.ts
- src/app/api/payments/webhook/route.ts
- src/app/api/export/flashcards/pdf/route.ts
- src/app/api/export/flashcards/anki/route.ts
- src/app/dashboard/settings/page.tsx
- src/app/pricing/page.tsx
- src/app/payment/callback/page.tsx
- src/app/admin/verifications/page.tsx
- src/features/identity/VerificationForm.tsx
- src/features/identity/VerificationBanner.tsx
- src/context/AuthContext.tsx
- src/app/dashboard/workspace/[workspaceId]/flashcards/page.tsx
- src/features/flashcards/api/flashcardsApi.ts
- src/app/api/v1/flashcards/[flashcardId]/review/route.ts
- src/domains/flashcards/services/flashcard-service.ts
- src/shared/lib/paystack/subscription.ts
- src/shared/lib/paystack/db.ts
- src/shared/lib/paystack/webhook-helpers.ts
- src/domains/users/contracts/viewer.ts
- src/domains/users/services/viewer-service.ts
- src/widgets/AppShell/AppShell.tsx

Required workflow:
1. Read the Phase 6 roadmap and migration/governance sections.
2. Audit the current repo against the unresolved Phase 6 concerns above.
3. Produce a short Phase 6 final-closure checklist.
4. Implement only the remaining missing Phase 6 work.
5. Run validation.
6. Report whether Phase 6 is now truly complete.
7. Only if Phase 6 is actually complete, then provide the Phase 7 execution checklist.

Expected first response format:
1. Phase 6 final-closure objective
2. Final-closure checklist
3. Files and areas to inspect first
4. Risks/dependencies
5. Start the work]

<reminder>
<sql_tables>No tables currently exist. Default tables (todos, todo_deps) will be created automatically when you first use the SQL tool.</sql_tables>
</reminder>
