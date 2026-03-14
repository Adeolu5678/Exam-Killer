# TASK-015 Context: Comprehensive Audit of React Components

## Goal

The user wants a line-by-line codebase audit to ensure absolute perfection, zero errors, and best-in-class code quality across UI components (`src/components/` directory).

## Scope

- All React components inside `src/components/`.

## Objectives

1. **Line-by-Line Review**: Check for bugs, memory leaks (uncleaned intervals/event listeners), and unoptimized renders.
2. **Accessibility (a11y)**: Check for missing `aria-` attributes, `alt` tags on images, keyboard navigability, and semantic HTML elements.
3. **State Management**: Ensure local state is managed efficiently without unnecessary prop drilling.
4. **Styling Consistency**: Ensure Tailwind CSS classes adhere to the global design system without brittle overrides.

## Execution Strategy

- Review methodically by folder (e.g., `analytics/`, `chat/`, `exam/`, `flashcards/`, `workspaces/`).
- Fix any React warnings (e.g., missing `key` props in lists).
- Create handoffs if you cannot complete all folders in one session.
