import { NextRequest } from 'next/server';

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';

function extractWorkspaceId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyWorkspaceAccess(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<DocumentSnapshot | null> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return null;
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData || workspaceData.user_id !== userId) {
    return null;
  }

  return workspaceDoc;
}

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  const workspaceDoc = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!workspaceDoc) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('source_id') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = db.collection('quizzes').where('workspace_id', '==', workspaceId);

  const quizzesSnapshot = await query.orderBy('created_at', 'desc').get();

  let quizzes = quizzesSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      quiz_id: data.quiz_id,
      workspace_id: data.workspace_id,
      source_id: data.source_id || null,
      total_questions: data.total_questions || 0,
      completed: data.completed || false,
      score: data.score || null,
      correct_count: data.correct_count || null,
      time_spent_seconds: data.time_spent_seconds || null,
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      completed_at: data.completed_at?.toDate?.()?.toISOString() || null,
    };
  });

  if (sourceId) {
    quizzes = quizzes.filter((quiz) => quiz.source_id === sourceId);
  }

  const total = quizzes.length;
  const paginatedQuizzes = quizzes.slice(offset, offset + limit);

  return successResponse({
    quizzes: paginatedQuizzes,
    total,
    limit,
    offset,
  });
});
