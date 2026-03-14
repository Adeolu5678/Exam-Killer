import { NextRequest, NextResponse } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import {
  UpdateWorkspaceRequest,
  WorkspaceDetail,
  WorkspaceDetailResponse,
  UpdateWorkspaceResponse,
  DeleteWorkspaceResponse,
} from '@/shared/types/api';
import { TutorPersonality } from '@/shared/types/database';

/**
 * Helper to extract workspaceId from URL
 * URL pattern: /api/workspaces/[workspaceId]
 */
function extractWorkspaceId(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[3] || null;
}

/**
 * Helper to fetch workspace with ownership/access check
 * Returns null if not found or access denied
 */
async function getWorkspaceWithAccess(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<{
  workspace: FirebaseFirestore.DocumentSnapshot;
  data: FirebaseFirestore.DocumentData;
  isOwner: boolean;
} | null> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return null;
  }

  const workspaceData = workspaceDoc.data();
  if (!workspaceData) {
    return null;
  }

  const isOwner = workspaceData.user_id === userId;

  // Check access: owner or public workspace
  if (!isOwner && !workspaceData.is_public) {
    return null;
  }

  return { workspace: workspaceDoc, data: workspaceData, isOwner };
}

/**
 * Helper to require workspace ownership (for mutations)
 * Returns null if not found or not owner
 */
async function requireWorkspaceOwnership(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<{
  workspace: FirebaseFirestore.DocumentSnapshot;
  data: FirebaseFirestore.DocumentData;
} | null> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return null;
  }

  const workspaceData = workspaceDoc.data();
  if (!workspaceData || workspaceData.user_id !== userId) {
    return null;
  }

  return { workspace: workspaceDoc, data: workspaceData };
}

export const GET = withAuth(async (request: NextRequest, { db, userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);

    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    const result = await getWorkspaceWithAccess(db, workspaceId, userId);

    if (!result) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const { workspace: workspaceDoc, data: workspaceData, isOwner } = result;

    const ownerDoc = await db.collection('users').doc(workspaceData.user_id).get();
    const ownerData = ownerDoc.exists ? ownerDoc.data() : null;

    const sourcesSnapshot = await db
      .collection('sources')
      .where('workspace_id', '==', workspaceId)
      .get();

    const sources = sourcesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.file_name || '',
        type: data.type || 'text',
        processed: data.processed || false,
        chunk_count: data.chunk_count || 0,
      };
    });

    const flashcardsSnapshot = await db
      .collection('flashcards')
      .where('workspace_id', '==', workspaceId)
      .get();

    const totalFlashcards = flashcardsSnapshot.docs.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueToday = flashcardsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.next_review && data.next_review.toDate && data.next_review.toDate() <= today;
    }).length;

    const flashcardStats = {
      total: totalFlashcards,
      due_today: dueToday,
      mastered: 0,
    };

    const workspace: WorkspaceDetail = {
      id: workspaceDoc.id,
      name: workspaceData.name || '',
      description: workspaceData.description || '',
      course_code: workspaceData.course_code || null,
      university: workspaceData.university || null,
      tutor_personality: (workspaceData.tutor_personality || 'mentor') as TutorPersonality,
      tutor_custom_instructions: workspaceData.tutor_custom_instructions || null,
      is_public: workspaceData.is_public || false,
      owner: {
        id: workspaceData.user_id || '',
        name: ownerData?.full_name || '',
        email: ownerData?.email || '',
      },
      user_role: isOwner ? 'owner' : null,
      sources,
      flashcard_stats: flashcardStats,
      recent_sessions: [],
      created_at: workspaceData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      last_accessed:
        workspaceData.last_accessed?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    await db.collection('workspaces').doc(workspaceId).update({
      last_accessed: new Date(),
    });

    const response: WorkspaceDetailResponse = { workspace };
    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get workspace error:', error);
    return errorResponse('Failed to fetch workspace');
  }
});

export const PUT = withAuth(async (request: NextRequest, { db, userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);

    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    const result = await requireWorkspaceOwnership(db, workspaceId, userId);

    if (!result) {
      return errorResponse('Workspace not found or access denied', StatusCodes.FORBIDDEN);
    }

    const body = await parseBody<UpdateWorkspaceRequest>(request);

    if (!body) {
      return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
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

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return errorResponse('Workspace name cannot be empty', StatusCodes.BAD_REQUEST);
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (course_code !== undefined) {
      updateData.course_code = course_code?.trim() || null;
    }

    if (university !== undefined) {
      updateData.university = university?.trim() || null;
    }

    if (tutor_personality !== undefined) {
      const validPersonality: TutorPersonality[] = [
        'mentor',
        'drill',
        'peer',
        'professor',
        'storyteller',
        'coach',
      ];
      if (!validPersonality.includes(tutor_personality)) {
        return errorResponse('Invalid tutor personality', StatusCodes.BAD_REQUEST);
      }
      updateData.tutor_personality = tutor_personality;
    }

    if (tutor_custom_instructions !== undefined) {
      updateData.tutor_custom_instructions = tutor_custom_instructions?.trim() || null;
    }

    if (is_public !== undefined) {
      updateData.is_public = is_public;
    }

    await db.collection('workspaces').doc(workspaceId).update(updateData);

    const updatedDoc = await db.collection('workspaces').doc(workspaceId).get();
    const updatedData = updatedDoc.data();

    if (!updatedData) {
      return errorResponse('Failed to update workspace');
    }

    const ownerDoc = await db.collection('users').doc(updatedData.user_id).get();
    const ownerData = ownerDoc.exists ? ownerDoc.data() : null;

    const workspace: WorkspaceDetail = {
      id: updatedDoc.id,
      name: updatedData.name || '',
      description: updatedData.description || '',
      course_code: updatedData.course_code || null,
      university: updatedData.university || null,
      tutor_personality: (updatedData.tutor_personality || 'mentor') as TutorPersonality,
      tutor_custom_instructions: updatedData.tutor_custom_instructions || null,
      is_public: updatedData.is_public || false,
      owner: {
        id: updatedData.user_id || '',
        name: ownerData?.full_name || '',
        email: ownerData?.email || '',
      },
      user_role: 'owner',
      sources: [],
      flashcard_stats: { total: 0, due_today: 0, mastered: 0 },
      recent_sessions: [],
      created_at: updatedData.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      last_accessed:
        updatedData.last_accessed?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    const response: UpdateWorkspaceResponse = { success: true, workspace };
    return successResponse(response);
  } catch (error: unknown) {
    console.error('Update workspace error:', error);
    return errorResponse('Failed to update workspace');
  }
});

export const DELETE = withAuth(async (request: NextRequest, { db, userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);

    if (!workspaceId) {
      return errorResponse('Workspace ID required', StatusCodes.BAD_REQUEST);
    }

    const result = await requireWorkspaceOwnership(db, workspaceId, userId);

    if (!result) {
      return errorResponse('Workspace not found or access denied', StatusCodes.FORBIDDEN);
    }

    const batch = db.batch();

    // Delete sources
    const sourcesSnapshot = await db
      .collection('sources')
      .where('workspace_id', '==', workspaceId)
      .get();
    sourcesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete flashcards
    const flashcardsSnapshot = await db
      .collection('flashcards')
      .where('workspace_id', '==', workspaceId)
      .get();
    flashcardsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete chat sessions
    const sessionsSnapshot = await db
      .collection('chat_sessions')
      .where('workspace_id', '==', workspaceId)
      .get();
    sessionsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete workspace members
    const membersSnapshot = await db
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .get();
    membersSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the workspace itself
    batch.delete(db.collection('workspaces').doc(workspaceId));

    await batch.commit();

    const response: DeleteWorkspaceResponse = { success: true };
    return successResponse(response);
  } catch (error: unknown) {
    console.error('Delete workspace error:', error);
    return errorResponse('Failed to delete workspace');
  }
});
