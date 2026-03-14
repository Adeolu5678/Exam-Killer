# TASK-019 Context: Redesign Dashboard & Workspace UI

## Goal

Apply the premium design system from TASK-018 to the main dashboard (`/dashboard`), the workspace detail view (`/dashboard/workspace/[workspaceId]`), and all shared layout components (Sidebar, TopNav).

## Objectives

1. **Dashboard Home**: Redesign the UI to look incredibly professional, similar to top-tier SaaS applications (e.g., Vercel, Linear, Notion).
2. **Card Components**: Upgrade workspace cards, stat trackers, and streak indicators with soft shadows, rounded corners (`rounded-xl` or `rounded-2xl`), and interactive hover states.
3. **Layout Cohesion**: Ensure the authenticated Sidebar and Top Header integrate seamlessly with plenty of whitespace and refined borders.
4. **Empty States**: If a workspace is empty, provide a beautiful zero-data state with an elegant illustration or custom icon and a prominent "Add Source" CTA.

## Execution Requirements

- Follow React/Next.js best practices for styling.
- Ensure the redesign remains fully responsive (mobile, tablet, desktop).
