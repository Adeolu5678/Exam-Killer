import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

const ExamUpdateSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  subject: z.string().min(1).max(100).optional(),
  examDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  venue: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  isPrimary: z.boolean().optional(),
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

function mapExam(doc: FirebaseFirestore.DocumentSnapshot) {
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

export const PATCH = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];
  const examId = request.nextUrl.pathname.split('/')[6];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const examRef = db.collection('study_exams').doc(examId);
  const examDoc = await examRef.get();
  if (!examDoc.exists || examDoc.data()?.workspace_id !== workspaceId) {
    return errorResponse('Exam not found', StatusCodes.NOT_FOUND);
  }

  const { data, error } = await parseBodyWithZod(request, ExamUpdateSchema);
  if (error) return error;
  if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

  const now = Timestamp.now();
  if (data.isPrimary === true) {
    const existingPrimary = await db
      .collection('study_exams')
      .where('workspace_id', '==', workspaceId)
      .where('is_primary', '==', true)
      .get();

    if (!existingPrimary.empty) {
      const batch = db.batch();
      existingPrimary.docs
        .filter((doc) => doc.id !== examId)
        .forEach((doc) => batch.update(doc.ref, { is_primary: false, updated_at: now }));
      await batch.commit();
    }
  }

  const updateData: Record<string, unknown> = { updated_at: now };
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.subject !== undefined) updateData.subject = data.subject.trim();
  if (data.examDate !== undefined) updateData.exam_date = data.examDate;
  if (data.venue !== undefined) updateData.venue = data.venue.trim();
  if (data.notes !== undefined) updateData.notes = data.notes.trim();
  if (data.isPrimary !== undefined) updateData.is_primary = data.isPrimary;

  await examRef.update(updateData);
  return successResponse(mapExam(await examRef.get()));
});

export const DELETE = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];
  const examId = request.nextUrl.pathname.split('/')[6];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const examRef = db.collection('study_exams').doc(examId);
  const examDoc = await examRef.get();
  if (!examDoc.exists || examDoc.data()?.workspace_id !== workspaceId) {
    return errorResponse('Exam not found', StatusCodes.NOT_FOUND);
  }

  await examRef.delete();
  return successResponse(null, StatusCodes.OK);
});
