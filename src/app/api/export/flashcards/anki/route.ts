import { NextRequest, NextResponse } from 'next/server';

import { withAuth, parseBody, errorResponse, StatusCodes } from '@/shared/lib/api/auth';

interface ExportRequest {
  workspace_id: string;
  source_id?: string;
  topic?: string;
}

export const POST = withAuth(async (request: NextRequest, { db, userId }) => {
  const body = await parseBody<ExportRequest>(request);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { workspace_id, source_id, topic } = body;

  if (!workspace_id) {
    return errorResponse('Workspace ID is required', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspace_id).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData || workspaceData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const flashcardsSnapshot = await db
    .collection('flashcards')
    .where('workspace_id', '==', workspace_id)
    .get();

  let flashcards = flashcardsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      front: data.front || '',
      back: data.back || '',
      tags: data.tags || [],
      source_id: data.source_id || null,
    };
  });

  if (source_id) {
    flashcards = flashcards.filter((card) => card.source_id === source_id);
  }

  if (topic) {
    flashcards = flashcards.filter((card) =>
      card.tags.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase())),
    );
  }

  if (flashcards.length === 0) {
    return errorResponse('No flashcards found', StatusCodes.NOT_FOUND);
  }

  const BOM = '\uFEFF';
  let csvContent = BOM + 'front,back,tags\n';

  for (const flashcard of flashcards) {
    const front = flashcard.front.replace(/"/g, '""');
    const back = flashcard.back.replace(/"/g, '""');
    const tags = flashcard.tags.join(';');
    csvContent += `"${front}","${back}","${tags}"\n`;
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flashcards-anki-${workspace_id}.csv"`,
    },
  });
});
