import { z } from 'zod';

// -----------------------------------------------------------------------------
// Canonical workspace ownership naming per rebuild decision
// -----------------------------------------------------------------------------
export const WORKSPACE_OWNER_FIELD = 'owner_user_id' as const;

// -----------------------------------------------------------------------------
// Tutor personality options
// -----------------------------------------------------------------------------
export const TUTOR_PERSONALITIES = [
  'mentor',
  'drill',
  'peer',
  'professor',
  'storyteller',
  'coach',
] as const;

export type TutorPersonality = (typeof TUTOR_PERSONALITIES)[number];

export const tutorPersonalitySchema = z.enum(TUTOR_PERSONALITIES);

// -----------------------------------------------------------------------------
// Workspace membership roles
// -----------------------------------------------------------------------------
export const WORKSPACE_ROLES = ['owner', 'admin', 'member'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// -----------------------------------------------------------------------------
// Workspace entity (Firestore document shape)
// -----------------------------------------------------------------------------
export interface WorkspaceRecord {
  workspace_id: string;
  owner_user_id: string;
  name: string;
  description: string;
  course_code: string | null;
  university: string | null;
  tutor_personality: TutorPersonality;
  tutor_custom_instructions: string | null;
  is_public: boolean;
  created_at: Date;
  last_accessed: Date;
}

// -----------------------------------------------------------------------------
// Workspace member entity (Firestore document shape)
// -----------------------------------------------------------------------------
export interface WorkspaceMemberRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string;
  joined_at: Date;
}

// -----------------------------------------------------------------------------
// API Request/Response schemas
// -----------------------------------------------------------------------------
export const createWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be under 100 characters')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(500, 'Description must be under 500 characters')
    .optional()
    .default('')
    .transform((v) => v.trim()),
  course_code: z
    .string()
    .max(30)
    .optional()
    .transform((v) => v?.trim() || null),
  university: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v?.trim() || null),
  tutor_personality: tutorPersonalitySchema.optional().default('mentor'),
  tutor_custom_instructions: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => v?.trim() || null),
  is_public: z.boolean().optional().default(false),
});

export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>;

export const updateWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100)
    .transform((v) => v.trim())
    .optional(),
  description: z
    .string()
    .max(500)
    .transform((v) => v.trim())
    .optional(),
  course_code: z
    .string()
    .max(30)
    .transform((v) => v?.trim() || null)
    .optional(),
  university: z
    .string()
    .max(100)
    .transform((v) => v?.trim() || null)
    .optional(),
  tutor_personality: tutorPersonalitySchema.optional(),
  tutor_custom_instructions: z
    .string()
    .max(1000)
    .transform((v) => v?.trim() || null)
    .optional(),
  is_public: z.boolean().optional(),
});

export type UpdateWorkspaceRequest = z.infer<typeof updateWorkspaceRequestSchema>;

// -----------------------------------------------------------------------------
// API Response types
// -----------------------------------------------------------------------------
export interface WorkspaceOwnerInfo {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  course_code: string | null;
  university: string | null;
  tutor_personality: TutorPersonality;
  is_public: boolean;
  owner_id: string;
  member_count: number;
  source_count: number;
  flashcard_count: number;
  created_at: string;
  last_accessed: string;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  tutor_custom_instructions: string | null;
  owner: WorkspaceOwnerInfo;
  user_role: WorkspaceRole;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface WorkspaceDetailResponse {
  workspace: WorkspaceDetail;
}

export interface CreateWorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    description: string;
  };
}

// -----------------------------------------------------------------------------
// Schema aliases (PascalCase for backward compatibility)
// -----------------------------------------------------------------------------
export const CreateWorkspaceRequestSchema = createWorkspaceRequestSchema;
export const UpdateWorkspaceRequestSchema = updateWorkspaceRequestSchema;
