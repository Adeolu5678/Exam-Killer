import { withAuth, successResponse, errorResponse, StatusCodes } from '@/shared/lib/api/auth';

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = new URL(request.url).pathname.split('/')[3];

  if (!workspaceId) {
    return errorResponse('Workspace ID is required', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData || workspaceData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const now = new Date();

  const flashcardsSnapshot = await db
    .collection('flashcards')
    .where('workspace_id', '==', workspaceId)
    .get();

  const dueFlashcards = flashcardsSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        front: data.front || '',
        back: data.back || '',
        tags: data.tags || [],
        difficulty: data.difficulty || 0,
        next_review: data.next_review?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    })
    .filter((card) => new Date(card.next_review) <= now);

  return successResponse({ flashcards: dueFlashcards });
});
