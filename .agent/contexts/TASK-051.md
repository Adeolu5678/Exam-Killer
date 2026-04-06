# TASK-051 — Replace Studio Page with "Coming Soon" (Audio/Video Features)

**Priority**: P1 🟠 HIGH  
**Status**: ⬚ PENDING  
**Dependencies**: TASK-050 must be completed first

---

## Objective

The Studio page (Audio Overview, Video Overview, Infographic) previously depended on
NotebookLM's async job queue. Since NLM has been removed and the Kilo model
(`minimax/minimax-m2.5-free`) does not produce audio or video, these features will be
surfaced as "Coming Soon" placeholders.

We need to:

1. Re-add the Studio route as a lightweight "Coming Soon" page
2. Re-add the "Studio" pill to the WorkspaceShell sub-nav (it pointing to a real route is fine)
3. The page must look polished and premium — not a blank stub

---

## Files to Create / Modify

### Create: `src/app/dashboard/workspace/[workspaceId]/studio/page.tsx`

This is a React Server Component (no `'use client'` needed unless using hooks).

**Design spec:**

- Full-width dark page matching the app design system
- Show 3 cards, one for each planned feature:
  - 🎙️ **Audio Overview** — "An AI-generated podcast-style summary of your sources. Coming soon."
  - 🎬 **Video Overview** — "A narrated video walkthrough of your study material. Coming soon."
  - 🗺️ **Infographic** — "A visual mind-map of key concepts. Coming soon."
- Each card should have:
  - A large icon (use lucide-react: `Mic2`, `Video`, `Map` or similar)
  - Feature name as heading
  - Short description
  - A `Badge` with text "Coming Soon" using the `secondary` or `outline` variant
  - A disabled `Button` with `disabled` prop set
- Page heading: "Studio" with subtitle "Premium AI-generated outputs for your workspace"
- Use `Card`, `Badge`, `Button` from `@/shared/ui`
- Use Tailwind CSS for layout (grid, gap, padding)
- Optional: add a top banner with an info icon saying "These features require voice model support. We're actively evaluating voice-capable providers."

### Modify: `src/widgets/WorkspaceShell/WorkspaceShell.tsx`

- Ensure the "Studio" pill link exists in `SUB_NAV_ITEMS` pointing to `/dashboard/workspace/${workspaceId}/studio`
- It was likely already there before TASK-050 removed the route — TASK-050 removed the Studio feature module but WorkspaceShell may still have the nav entry. Just verify it's present.
- If it was removed in TASK-050, re-add it. The route now exists again as a Coming Soon page.

---

## Design Tokens to Use

```tsx
// Card grid layout
<div className="grid grid-cols-1 gap-6 md:grid-cols-3">

// Coming Soon badge
<Badge variant="outline">Coming Soon</Badge>

// Disabled action button
<Button variant="secondary" disabled>Generate</Button>
```

---

## Verification

```bash
npx tsc --noEmit
npm run lint
```

Both must pass. Optionally spin up `npm run dev` to visually confirm the page renders.

Update task registry: mark TASK-051 ✅ COMPLETED when done.
