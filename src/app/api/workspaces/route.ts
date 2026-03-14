import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { withAuth, parseBodyWithZod, errorResponse, successResponse } from '@/shared/lib/api/auth';
import { WorkspacesResponse, WorkspaceListItem, PaginationMeta } from '@/shared/types/api';
import { TutorPersonality } from '@/shared/types/database';

const VALID_PERSONALITIES = [
  'mentor',
  'drill',
  'peer',
  'professor',
  'storyteller',
  'coach',
] as const;

const CreateWorkspaceRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .transform((v) => v.trim()),
  description: z
    .string()
    .optional()
    .transform((v) => v?.trim() || ''),
  course_code: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  university: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  tutor_personality: z.enum(VALID_PERSONALITIES).optional().default('mentor'),
  tutor_custom_instructions: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  is_public: z.boolean().optional().default(false),
});

export const GET = withAuth(async (request, { db, userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const workspacesRef = db.collection('workspaces');

    let querySnapshot;

    if (search) {
      querySnapshot = await workspacesRef
        .where('user_id', '==', userId)
        .where('name', '>=', search)
        .where('name', '<=', search + '\uf8ff')
        .get();
    } else {
      querySnapshot = await workspacesRef.where('user_id', '==', userId).get();
    }

    const workspaces = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        course_code: data.course_code || null,
        university: data.university || null,
        tutor_personality: data.tutor_personality || 'mentor',
        is_public: data.is_public || false,
        owner_id: data.user_id || '',
        member_count: 0,
        source_count: 0,
        flashcard_count: 0,
        created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        last_accessed: data.last_accessed?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as WorkspaceListItem;
    });

    const total = workspaces.length;
    const startIndex = (page - 1) * limit;
    const paginatedWorkspaces = workspaces.slice(startIndex, startIndex + limit);

    const pagination: PaginationMeta = {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };

    const response: WorkspacesResponse = {
      workspaces: paginatedWorkspaces,
      pagination,
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get workspaces error:', error);
    return errorResponse('Failed to fetch workspaces');
  }
});

export const POST = withAuth(async (request, { db, userId }) => {
  try {
    const { data: body, error } = await parseBodyWithZod(request, CreateWorkspaceRequestSchema);

    if (error) {
      return error;
    }
    if (!body) {
      return errorResponse('Invalid request body', 400); // 400 is StatusCodes.BAD_REQUEST
    }

    const {
      name,
      description,
      course_code,
      university,
      tutor_personality,
      tutor_custom_instructions,
      is_public,
    } = body;

    const personality = tutor_personality as TutorPersonality;

    const workspacesRef = db.collection('workspaces');
    const newWorkspaceRef = workspacesRef.doc();
    const workspaceId = newWorkspaceRef.id;

    const now = new Date();
    await newWorkspaceRef.set({
      workspace_id: workspaceId,
      user_id: userId,
      name,
      description,
      course_code,
      university,
      tutor_personality: personality,
      tutor_custom_instructions,
      is_public,
      created_at: now,
      last_accessed: now,
    });

    return successResponse(
      {
        workspace: {
          id: workspaceId,
          name,
          description,
        },
      },
      201,
    );
  } catch (error: unknown) {
    console.error('Create workspace error:', error);
    return errorResponse('Failed to create workspace');
  }
});
