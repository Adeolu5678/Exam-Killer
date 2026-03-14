import { NextRequest } from 'next/server';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

interface Flashcard {
  workspace_id: string;
  user_id: string;
  [key: string]: unknown;
}

function extractFlashcardId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

async function verifyFlashcardAccess(
  db: FirebaseFirestore.Firestore,
  flashcardId: string,
  userId: string,
): Promise<{ flashcard: FirebaseFirestore.DocumentSnapshot; workspaceId: string } | null> {
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    return null;
  }

  const flashcardData = flashcardDoc.data() as Flashcard | undefined;

  if (!flashcardData) {
    return null;
  }

  const workspaceId = flashcardData.workspace_id;

  if (!workspaceId) {
    return null;
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return null;
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData || workspaceData.user_id !== userId) {
    return null;
  }

  return { flashcard: flashcardDoc, workspaceId };
}

export const GET = withAuth(async (request, { db, userId }) => {
  const flashcardId = extractFlashcardId(request);

  const access = await verifyFlashcardAccess(db, flashcardId, userId);

  if (!access) {
    return errorResponse('Flashcard not found', StatusCodes.NOT_FOUND);
  }

  return successResponse(access.flashcard.data());
});

interface UpdateFlashcardBody {
  front?: string;
  back?: string;
}

export const PUT = withAuth(async (request, { db, userId }) => {
  const flashcardId = extractFlashcardId(request);
  const body = await parseBody<UpdateFlashcardBody>(request);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const access = await verifyFlashcardAccess(db, flashcardId, userId);

  if (!access) {
    return errorResponse('Flashcard not found', StatusCodes.NOT_FOUND);
  }

  const updateData: Record<string, unknown> = {};

  if (body.front !== undefined) {
    updateData.front = body.front;
  }

  if (body.back !== undefined) {
    updateData.back = body.back;
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse('No valid fields to update', StatusCodes.BAD_REQUEST);
  }

  updateData.updated_at = new Date();

  await db.collection('flashcards').doc(flashcardId).update(updateData);

  const updatedDoc = await db.collection('flashcards').doc(flashcardId).get();

  return successResponse(updatedDoc.data());
});

export const DELETE = withAuth(async (request, { db, userId }) => {
  const flashcardId = extractFlashcardId(request);

  const access = await verifyFlashcardAccess(db, flashcardId, userId);

  if (!access) {
    return errorResponse('Flashcard not found', StatusCodes.NOT_FOUND);
  }

  await db.collection('flashcards').doc(flashcardId).delete();

  return successResponse({ success: true });
});
