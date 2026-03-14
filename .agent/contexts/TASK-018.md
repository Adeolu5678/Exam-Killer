# TASK-018 Context: Implement Premium Design System (Tailwind Config)

## Goal

The application currently looks "vibecoded" (too basic). We need to elevate the aesthetic foundation in `tailwind.config.ts` and `globals.css` so that subsequent component redesigns can inherit premium styles automatically.

## Objectives

1. **Typography**: Ensure we are using a premium font stack (e.g., Inter or Plus Jakarta Sans). Adjust leading/tracking utilities if necessary.
2. **Color Palette**: Replace standard Tailwind colors with a custom, rich palette (Primary: Indigo/Violet gradient mixes, Neutral: Slate gradients).
3. **Micro-interactions & Effects**:
   - Add custom animations (fade-in, slide-up, pulse).
   - Add glassmorphism utility classes (background blur, subtle borders).
   - Add soft, professional shadow utilities (e.g., `shadow-soft`, `shadow-glow`).

## Execution Requirements

- Keep existing custom colors but refine them.
- Do NOT rewrite random components yet—focus _only_ on the global definitions that all UI components will consume.
