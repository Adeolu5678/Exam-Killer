# TASK-017 Context: Refactor App Router Layouts & Remove Global Navbar

## Goal

The global marketing `<Navbar />` is persisting into the authenticated dashboard because it is currently hardcoded into `src/app/layout.tsx`.

## Objectives

1. **Remove Global UI Elements**: Remove `<Navbar />` and `<main className="pt-16">` from `src/app/layout.tsx`. Keep `RootLayout` strictly for the `AuthProvider` and HTML/Body tags.
2. **Implement Route Groups**:
   - Create a `(marketing)` route group (folder). Move `src/app/page.tsx`, `src/app/pricing/page.tsx` into this folder.
   - Create a `src/app/(marketing)/layout.tsx` wrapper that includes the marketing `<Navbar />` and `<Footer />`.
   - Ensure the dashboard retains its own specific Sidebar/Header layout structure without the marketing `Navbar` overlapping.

## Execution Requirements

- Do not break existing authentication context.
- Verify that users visiting the root `/` URL still see the marketing index page with the intended Navbar. Verify that `/dashboard` no longer shows the "Exam-Killer" landing page logo bar.
