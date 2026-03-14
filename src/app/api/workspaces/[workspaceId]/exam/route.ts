import { NextRequest, NextResponse } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';

function extractWorkspaceId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyWorkspaceAccess(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return false;
  }

  const workspaceData = workspaceDoc.data();
  return workspaceData?.user_id === userId;
}

export const GET = withAuth(async (request, { db, userId }) => {
  try {
    const workspaceId = extractWorkspaceId(request);

    const hasAccess = await verifyWorkspaceAccess(db, workspaceId, userId);

    if (!hasAccess) {
      return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const examsSnapshot = await db
      .collection('exams')
      .where('workspace_id', '==', workspaceId)
      .orderBy('created_at', 'desc')
      .get();

    const exams = examsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        exam_id: data.exam_id || doc.id,
        workspace_id: data.workspace_id,
        title:
          data.title ||
          `Exam - ${new Date(data.created_at?.toDate?.() || new Date()).toLocaleDateString()}`,
        question_count: data.question_count || 0,
        time_limit_minutes: data.time_limit_minutes || 0,
        status: data.status || 'in_progress',
        created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        completed_at: data.completed_at?.toDate?.()?.toISOString() || null,
        score: data.score || null,
        correct_count: data.correct_count || null,
        xp_earned: data.xp_earned || null,
      };
    });

    const total = exams.length;
    const paginatedExams = exams.slice(offset, offset + limit);

    return successResponse({
      exams: paginatedExams,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('List exams error:', error);
    return errorResponse('Failed to list exams', StatusCodes.INTERNAL_ERROR);
  }
});
