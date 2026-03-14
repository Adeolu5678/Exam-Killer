// =============================================================================
// features/workspace/model/types.ts
// Layer: features → workspace → model
// Purpose: Feature-local Zod schemas + inferred TypeScript types.
//          Re-exports the API types that consumers need (via index.ts).
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Re-export canonical API types used across the workspace feature
// ---------------------------------------------------------------------------
export type { WorkspaceListItem, WorkspaceDetail } from '@/shared/types/api';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

/** Validated at runtime when the user submits the creator form */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(60, 'Workspace name must be under 60 characters'),
  description: z.string().max(200, 'Description too long').optional(),
  course_code: z.string().max(20).optional(),
  university: z.string().max(80).optional(),
  tutor_personality: z
    .enum(['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'])
    .default('mentor'),
  is_public: z.boolean().default(false),
});

export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = createWorkspaceSchema.partial();
export type UpdateWorkspaceFormValues = z.infer<typeof updateWorkspaceSchema>;

// ---------------------------------------------------------------------------
// UI-facing types (not from API — derived for display)
// ---------------------------------------------------------------------------

/** The personality options available in the WorkspaceCreator step */
export const TUTOR_PERSONALITIES = [
  {
    id: 'mentor' as const,
    label: 'Patient Mentor',
    emoji: '🎓',
    description: 'Explains concepts step-by-step with warmth',
  },
  {
    id: 'drill' as const,
    label: 'Drill Sergeant',
    emoji: '⚡',
    description: 'High-intensity, no-nonsense exam prep',
  },
  {
    id: 'peer' as const,
    label: 'Study Buddy',
    emoji: '🤝',
    description: 'Casual and collaborative, like a classmate',
  },
  {
    id: 'professor' as const,
    label: 'Professor',
    emoji: '📚',
    description: 'Academic, thorough, and reference-heavy',
  },
  {
    id: 'storyteller' as const,
    label: 'Storyteller',
    emoji: '📖',
    description: 'Makes concepts stick with vivid analogies',
  },
  {
    id: 'coach' as const,
    label: 'Life Coach',
    emoji: '🏆',
    description: 'Motivates you to stay consistent and focused',
  },
] as const;

export type TutorPersonalityId = (typeof TUTOR_PERSONALITIES)[number]['id'];

/** Step index for the multi-step WorkspaceCreator dialog */
export type CreatorStep = 0 | 1 | 2;
