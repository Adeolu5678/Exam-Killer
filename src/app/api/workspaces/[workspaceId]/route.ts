import { NextRequest } from 'next/server';

import { z } from 'zod';

import { listWorkspaceSources } from '@/domains/sources';
import {
  deleteWorkspace as deleteWorkspaceRebuild,
  getWorkspaceDetail as getWorkspaceDetailRebuild,
  updateWorkspace as updateWorkspaceRebuild,
} from '@/domains/workspaces';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import {
  WorkspaceDetail,
  WorkspaceDetailResponse,
  UpdateWorkspaceResponse,
  DeleteWorkspaceResponse,
} from '@/shared/types/api';
import { TutorPersonality } from '@/shared/types/database';

const VALID_TUTOR_PERSONALITIES = [
  'mentor',
  'drill',
  'peer',
  'professor',
  'storyteller',
  'coach',
] as const;

const UpdateWorkspaceRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  course_code: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
  tutor_personality: z.enum(VALID_TUTOR_PERSONALITIES).optional(),
  tutor_custom_instructions: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
});

function extractWorkspaceId(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[3] || null;
}

async function buildWorkspaceDetailResponse(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceDetailResponse> {
  const workspaceDetail = await getWorkspaceDetailRebuild(workspaceId, userId);
  const sourcesResult = await listWorkspaceSources(workspaceId, userId, { page: 1, limit: 100 });

  const workspace: WorkspaceDetail = {
    id: workspaceDetail.id,
    name: workspaceDetail.name,
    description: workspaceDetail.description || '',
    course_code: workspaceDetail.course_code || null,
    university: workspaceDetail.university || null,
    tutor_personality: workspaceDetail.tutor_personality as TutorPersonality,
    tutor_custom_instructions: workspaceDetail.tutor_custom_instructions || null,
    is_public: workspaceDetail.is_public,
    owner: {
      id: workspaceDetail.owner.id,
      name: workspaceDetail.owner.name,
      email: workspaceDetail.owner.email,
    },
    user_role: workspaceDetail.user_role,
    sources: sourcesResult.sources.map((source) => ({
      id: source.id,
      name: source.file_name,
      type: source.type,
      processed: source.processed,
      chunk_count: source.chunk_count,
    })),
    flashcard_stats: {
      total: workspaceDetail.flashcard_count,
      due_today: 0,
      mastered: 0,
    },
    recent_sessions: [],
    created_at: workspaceDetail.created_at,
    last_accessed: workspaceDetail.last_accessed,
  };

  return { workspace };
}

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);
    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    const response = await buildWorkspaceDetailResponse(workspaceId, userId);
    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get workspace error:', error);
    return errorResponse('Failed to fetch workspace');
  }
});

export const PUT = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);
    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    const { data: body, error } = await parseBodyWithZod(request, UpdateWorkspaceRequestSchema);
    if (error) return error;
    if (!body) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

    const normalizedBody = {
      ...body,
      description: body.description ?? undefined,
      tutor_custom_instructions: body.tutor_custom_instructions ?? undefined,
    };

    await updateWorkspaceRebuild(workspaceId, userId, normalizedBody);

    const detailResponse = await buildWorkspaceDetailResponse(workspaceId, userId);
    const response: UpdateWorkspaceResponse = {
      success: true,
      workspace: detailResponse.workspace,
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Update workspace error:', error);
    return errorResponse('Failed to update workspace');
  }
});

export const DELETE = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);
    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    await deleteWorkspaceRebuild(workspaceId, userId);

    const response: DeleteWorkspaceResponse = { success: true };
    return successResponse(response);
  } catch (error: unknown) {
    console.error('Delete workspace error:', error);
    return errorResponse('Failed to delete workspace');
  }
});
