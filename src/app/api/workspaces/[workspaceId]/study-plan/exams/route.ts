import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

const ExamSchema = z.object({
  title: z.string().min(1).max(150),
  subject: z.string().min(1).max(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  isPrimary: z.boolean().default(false),
});

async function verifyWorkspaceAccess(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) return false;
  const workspaceData = workspaceDoc.data();
  if (!workspaceData) return false;
  if (workspaceData.user_id === userId || workspaceData.is_public === true) return true;

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  return !memberSnapshot.empty;
}

function mapExam(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
) {
  const data = doc.data() as
    | {
        workspace_id?: string;
        title?: string;
        subject?: string;
        exam_date?: string;
        venue?: string;
        notes?: string;
        is_primary?: boolean;
        created_at?: { toDate?: () => Date };
        updated_at?: { toDate?: () => Date };
      }
    | undefined;

  return {
    id: doc.id,
    workspaceId: data?.workspace_id || '',
    title: data?.title || '',
    subject: data?.subject || '',
    examDate: data?.exam_date || '',
    venue: data?.venue || undefined,
    notes: data?.notes || undefined,
    isPrimary: data?.is_primary || false,
    createdAt: data?.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data?.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const snapshot = await db
    .collection('study_exams')
    .where('workspace_id', '==', workspaceId)
    .orderBy('exam_date', 'asc')
    .get();

  return successResponse(snapshot.docs.map((doc) => mapExam(doc)));
});

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const { data, error } = await parseBodyWithZod(request, ExamSchema);
  if (error) return error;
  if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

  const examRef = db.collection('study_exams').doc();
  const now = Timestamp.now();

  if (data.isPrimary) {
    const existingPrimary = await db
      .collection('study_exams')
      .where('workspace_id', '==', workspaceId)
      .where('is_primary', '==', true)
      .get();

    if (!existingPrimary.empty) {
      const batch = db.batch();
      existingPrimary.docs.forEach((doc) =>
        batch.update(doc.ref, { is_primary: false, updated_at: now }),
      );
      await batch.commit();
    }
  }

  await examRef.set({
    workspace_id: workspaceId,
    user_id: userId,
    title: data.title.trim(),
    subject: data.subject.trim(),
    exam_date: data.examDate,
    venue: data.venue?.trim() || '',
    notes: data.notes?.trim() || '',
    is_primary: data.isPrimary,
    created_at: now,
    updated_at: now,
  });

  return successResponse(mapExam(await examRef.get()), StatusCodes.CREATED);
});
