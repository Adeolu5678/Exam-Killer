import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

const SessionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['reading', 'practice', 'review', 'exam-prep', 'break']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).optional(),
});

async function verifyWorkspaceAccess(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    return false;
  }

  const workspaceData = workspaceDoc.data();
  if (!workspaceData) {
    return false;
  }

  if (workspaceData.user_id === userId || workspaceData.is_public === true) {
    return true;
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  return !memberSnapshot.empty;
}

function mapSession(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
) {
  const data = doc.data() as
    | {
        workspace_id?: string;
        title?: string;
        description?: string;
        category?: string;
        status?: string;
        start_time?: { toDate?: () => Date };
        end_time?: { toDate?: () => Date };
        duration_minutes?: number;
        is_recurring?: boolean;
        recurrence_days?: number[];
        completed_at?: { toDate?: () => Date };
        created_at?: { toDate?: () => Date };
        updated_at?: { toDate?: () => Date };
      }
    | undefined;

  return {
    id: doc.id,
    workspaceId: data?.workspace_id || '',
    title: data?.title || '',
    description: data?.description || undefined,
    category: data?.category || 'reading',
    status: data?.status || 'scheduled',
    startTime: data?.start_time?.toDate?.()?.toISOString() || new Date().toISOString(),
    endTime: data?.end_time?.toDate?.()?.toISOString() || new Date().toISOString(),
    durationMinutes: data?.duration_minutes || 0,
    isRecurring: data?.is_recurring || false,
    recurrenceDays: data?.recurrence_days || undefined,
    completedAt: data?.completed_at?.toDate?.()?.toISOString(),
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
    .collection('study_sessions')
    .where('workspace_id', '==', workspaceId)
    .orderBy('start_time', 'asc')
    .get();

  return successResponse(snapshot.docs.map((doc) => mapSession(doc)));
});

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const { data, error } = await parseBodyWithZod(request, SessionSchema);
  if (error) return error;
  if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  const durationMinutes = Math.max(
    0,
    Math.round((endTime.getTime() - startTime.getTime()) / 60000),
  );

  const sessionRef = db.collection('study_sessions').doc();
  const now = Timestamp.now();

  await sessionRef.set({
    workspace_id: workspaceId,
    user_id: userId,
    title: data.title.trim(),
    description: data.description?.trim() || '',
    category: data.category,
    status: 'scheduled',
    start_time: Timestamp.fromDate(startTime),
    end_time: Timestamp.fromDate(endTime),
    duration_minutes: durationMinutes,
    is_recurring: data.isRecurring,
    recurrence_days: data.recurrenceDays || [],
    completed_at: null,
    created_at: now,
    updated_at: now,
  });

  const createdDoc = await sessionRef.get();
  return successResponse(mapSession(createdDoc), StatusCodes.CREATED);
});
