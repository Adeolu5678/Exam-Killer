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
    const [ownedSnapshot, memberSnapshot] = await Promise.all([
      workspacesRef.where('user_id', '==', userId).get(),
      db.collection('workspace_members').where('user_id', '==', userId).get(),
    ]);

    const workspaceDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    ownedSnapshot.docs.forEach((doc) => workspaceDocs.set(doc.id, doc));

    if (!memberSnapshot.empty) {
      const memberWorkspaceDocs = await Promise.all(
        memberSnapshot.docs.map(async (memberDoc) => {
          const workspaceId = memberDoc.data().workspace_id as string | undefined;
          if (!workspaceId || workspaceDocs.has(workspaceId)) {
            return null;
          }

          const workspaceDoc = await workspacesRef.doc(workspaceId).get();
          return workspaceDoc.exists ? workspaceDoc : null;
        }),
      );

      memberWorkspaceDocs.forEach((doc) => {
        if (doc?.exists) {
          workspaceDocs.set(doc.id, doc as FirebaseFirestore.QueryDocumentSnapshot);
        }
      });
    }

    const normalizedSearch = search.trim().toLowerCase();
    const filteredWorkspaceDocs = Array.from(workspaceDocs.values()).filter((doc) => {
      if (!normalizedSearch) {
        return true;
      }

      const data = doc.data();
      return String(data.name || '')
        .toLowerCase()
        .includes(normalizedSearch);
    });

    const workspaces = await Promise.all(
      filteredWorkspaceDocs.map(async (doc) => {
        const data = doc.data();
        const workspaceId = doc.id;

        const [sourcesSnapshot, flashcardsSnapshot, membersSnapshot] = await Promise.all([
          db.collection('sources').where('workspace_id', '==', workspaceId).count().get(),
          db.collection('flashcards').where('workspace_id', '==', workspaceId).count().get(),
          db.collection('workspace_members').where('workspace_id', '==', workspaceId).count().get(),
        ]);

        return {
          id: workspaceId,
          name: data.name || '',
          description: data.description || '',
          course_code: data.course_code || null,
          university: data.university || null,
          tutor_personality: data.tutor_personality || 'mentor',
          is_public: data.is_public || false,
          owner_id: data.user_id || '',
          member_count: (membersSnapshot.data().count || 0) + 1,
          source_count: sourcesSnapshot.data().count || 0,
          flashcard_count: flashcardsSnapshot.data().count || 0,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          last_accessed: data.last_accessed?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as WorkspaceListItem;
      }),
    );

    workspaces.sort((a, b) => b.last_accessed.localeCompare(a.last_accessed));

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
    const { getUserSubscription } = await import('@/shared/lib/paystack/db');
    const { getPlanDetails, getEffectivePlan } = await import('@/shared/lib/paystack/subscription');
    const subscription = await getUserSubscription(userId);
    const effectivePlan = getEffectivePlan(subscription);
    const workspaceLimit = getPlanDetails(effectivePlan).features.workspaces;

    const workspacesRef = db.collection('workspaces');
    const newWorkspaceRef = workspacesRef.doc();
    const workspaceId = newWorkspaceRef.id;

    const now = new Date();
    try {
      await db.runTransaction(async (transaction) => {
        if (workspaceLimit !== 'unlimited') {
          const existingWorkspaces = await transaction.get(
            db.collection('workspaces').where('user_id', '==', userId).limit(workspaceLimit),
          );

          if (existingWorkspaces.size >= workspaceLimit) {
            throw new Error('WORKSPACE_LIMIT_REACHED');
          }
        }

        transaction.set(newWorkspaceRef, {
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
      });
    } catch (txError: unknown) {
      if (txError instanceof Error && txError.message === 'WORKSPACE_LIMIT_REACHED') {
        return errorResponse(
          'You have reached your workspace limit. Upgrade your plan for more workspaces.',
          403,
          { upgradeRequired: effectivePlan === 'free' },
        );
      }
      throw txError;
    }

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
