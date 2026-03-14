import { NextRequest, NextResponse } from 'next/server';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  AuthErrors,
} from '@/shared/lib/api/auth';
import { getInitialFlashcardData } from '@/shared/lib/spaced-repetition';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractWorkspaceId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyWorkspaceAccess(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
  userId: string,
): Promise<{ exists: boolean; hasAccess: boolean }> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return { exists: false, hasAccess: false };
  }

  const workspaceData = workspaceDoc.data();
  return { exists: true, hasAccess: workspaceData?.user_id === userId };
}

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);
  const { exists, hasAccess } = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  if (!hasAccess) {
    return NextResponse.json(AuthErrors.FORBIDDEN, {
      status: StatusCodes.FORBIDDEN,
    });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get('source_id') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const flashcardsSnapshot = await db
    .collection('flashcards')
    .where('workspace_id', '==', workspaceId)
    .get();

  let flashcards = flashcardsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      front: data.front || '',
      back: data.back || '',
      tags: data.tags || [],
      difficulty: data.difficulty || 0,
      next_review: data.next_review?.toDate?.()?.toISOString() || new Date().toISOString(),
      source_id: data.source_id || null,
    };
  });

  if (sourceId) {
    flashcards = flashcards.filter((card) => card.source_id === sourceId);
  }

  const paginatedFlashcards = flashcards.slice(offset, offset + limit);

  return successResponse({ flashcards: paginatedFlashcards });
});

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);
  const { exists, hasAccess } = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  if (!hasAccess) {
    return NextResponse.json(AuthErrors.FORBIDDEN, {
      status: StatusCodes.FORBIDDEN,
    });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { front, back, source_id, tags } = body;

  if (!front || !back) {
    return errorResponse('Front and back are required', StatusCodes.BAD_REQUEST);
  }

  const flashcardId = generateUUID();
  const initialData = getInitialFlashcardData();

  const flashcardData = {
    flashcard_id: flashcardId,
    workspace_id: workspaceId,
    user_id: userId,
    source_id: source_id || null,
    front,
    back,
    tags: tags || [],
    difficulty: 0,
    ease_factor: initialData.ease_factor,
    interval: initialData.interval,
    repetitions: initialData.repetitions,
    next_review: initialData.next_review,
    review_count: 0,
    created_at: new Date(),
  };

  const flashcardRef = await db.collection('flashcards').add(flashcardData);

  const flashcard = {
    id: flashcardRef.id,
    front,
    back,
    tags: tags || [],
    difficulty: 0,
    next_review: initialData.next_review.toISOString(),
  };

  return NextResponse.json({ flashcard }, { status: StatusCodes.CREATED });
});
