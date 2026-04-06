import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  errorResponse,
  successResponse,
  StatusCodes,
  parseBodyWithZod,
} from '@/shared/lib/api/auth';
import { getAdminAuth, getAdminStorage, getStorageBucket } from '@/shared/lib/firebase/admin';
import { clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import type {
  DeleteProfileResponse,
  ProfileResponse,
  UpdateProfileResponse,
} from '@/shared/types/api';
import type { TutorPersonality } from '@/shared/types/database';

const UpdateProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(80).optional(),
  department: z.string().trim().max(120).optional(),
  level: z.number().int().min(100).max(700).nullable().optional(),
  bio: z.string().trim().max(280).nullable().optional(),
  preferred_tutor_personality: z
    .enum(['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'])
    .optional(),
  theme_preference: z.enum(['light', 'dark', 'system']).optional(),
  content_density: z.enum(['comfortable', 'compact']).optional(),
  notification_preferences: z
    .object({
      due_cards: z.boolean(),
      streaks: z.boolean(),
      exam_countdowns: z.boolean(),
      workspace_invitations: z.boolean(),
    })
    .optional(),
});

const DeleteProfileSchema = z.object({
  email: z.string().trim().email(),
  confirmation_text: z.literal('DELETE MY ACCOUNT'),
});

async function deleteQueryInChunks(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
): Promise<void> {
  const snapshot = await query.get();
  if (snapshot.empty) {
    return;
  }

  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = snapshot.docs.slice(index, index + 400);
    const deleteBatch = snapshot.query.firestore.batch();
    batch.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
  }
}

async function deleteSourceArtifacts(
  sourceDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<void> {
  if (sourceDocs.length === 0) {
    return;
  }

  const storage = getAdminStorage();
  const bucketName = getStorageBucket();
  const { deleteBySource } = await import('@/shared/lib/rag/vector-store');

  for (const sourceDoc of sourceDocs) {
    const sourceData = sourceDoc.data();
    const storagePath =
      typeof sourceData.storage_path === 'string' ? sourceData.storage_path : undefined;
    const workspaceId =
      typeof sourceData.workspace_id === 'string' ? sourceData.workspace_id : undefined;

    if (storage && bucketName && storagePath) {
      try {
        await storage.bucket(bucketName).file(storagePath).delete();
      } catch (storageError) {
        console.warn('Failed to delete source file during account cleanup:', storageError);
      }
    }

    if (workspaceId) {
      try {
        await deleteBySource(sourceDoc.id, workspaceId);
      } catch (vectorError) {
        console.warn('Failed to delete source vectors during account cleanup:', vectorError);
      }
    }
  }

  for (let index = 0; index < sourceDocs.length; index += 400) {
    const batch = sourceDocs[0].ref.firestore.batch();
    sourceDocs.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function deleteWorkspaceGraph(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
): Promise<void> {
  const sourceSnapshot = await db
    .collection('sources')
    .where('workspace_id', '==', workspaceId)
    .get();
  await deleteSourceArtifacts(sourceSnapshot.docs);

  const workspaceScopedCollections = [
    'flashcards',
    'quizzes',
    'exams',
    'study_sessions',
    'study_exams',
    'study_plans',
    'workspace_members',
    'workspace_invites',
    'tutor_messages',
    'chat_sessions',
    'vector_chunks',
  ] as const;

  for (const collectionName of workspaceScopedCollections) {
    await deleteQueryInChunks(
      db.collection(collectionName).where('workspace_id', '==', workspaceId),
    );
  }

  await db.collection('workspaces').doc(workspaceId).delete();
}

export const GET = withAuth(async (_request, { db, userId, user }) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return errorResponse('Profile not found', StatusCodes.NOT_FOUND);
    }

    const data = userDoc.data();

    const response: ProfileResponse = {
      profile: {
        id: userId,
        email: user.email ?? '',
        full_name: data?.full_name ?? user.displayName ?? '',
        bio: data?.bio ?? null,
        is_admin: Boolean(data?.is_admin),
        theme_preference: data?.theme_preference ?? 'dark',
        content_density: data?.content_density ?? 'comfortable',
        notification_preferences: {
          due_cards: data?.notification_preferences?.due_cards ?? true,
          streaks: data?.notification_preferences?.streaks ?? true,
          exam_countdowns: data?.notification_preferences?.exam_countdowns ?? true,
          workspace_invitations: data?.notification_preferences?.workspace_invitations ?? true,
        },
        matric_number: data?.matric_number ?? null,
        department: data?.department ?? null,
        level: typeof data?.level === 'number' ? data.level : null,
        subscription_status: data?.subscription_status ?? 'inactive',
        subscription_tier: data?.subscription_tier ?? 'free',
        paid_until: data?.paid_until?.toDate?.()?.toISOString?.() ?? null,
        free_explanations_used: data?.free_explanations_used ?? 0,
        free_explanations_limit: data?.free_explanations_limit ?? 0,
        free_ai_queries_used: data?.free_ai_queries_used ?? 0,
        free_ai_queries_limit: data?.free_ai_queries_limit ?? 0,
        current_streak: data?.current_streak ?? 0,
        total_xp: data?.total_xp ?? 0,
        preferred_tutor_personality: data?.preferred_tutor_personality ?? 'mentor',
        referral_code: data?.referral_code ?? '',
        referral_credits: data?.referral_credits ?? 0,
      },
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    return errorResponse('Failed to load profile', StatusCodes.INTERNAL_ERROR);
  }
});

export const PATCH = withAuth(async (request, { db, userId }) => {
  const { data, error } = await parseBodyWithZod(request, UpdateProfileSchema);

  if (error) {
    return error;
  }

  if (!data) {
    return errorResponse('Invalid profile update payload', StatusCodes.BAD_REQUEST);
  }

  try {
    const auth = getAdminAuth();
    const existingDoc = await db.collection('users').doc(userId).get();
    if (!existingDoc.exists) {
      return errorResponse('Profile not found', StatusCodes.NOT_FOUND);
    }

    const existingProfile = existingDoc.data();
    const resolvedFullName = data.full_name?.trim() || existingProfile?.full_name;

    if (!resolvedFullName || resolvedFullName.length < 2) {
      return errorResponse('Full name is required', StatusCodes.BAD_REQUEST);
    }

    const department =
      data.department !== undefined
        ? data.department.trim() || null
        : (existingProfile?.department ?? null);
    const bio = data.bio !== undefined ? data.bio?.trim() || null : (existingProfile?.bio ?? null);
    const updateData: Record<string, unknown> = {
      full_name: resolvedFullName,
      updated_at: Timestamp.now(),
    };

    if (data.department !== undefined) {
      updateData.department = department;
    }
    if (data.level !== undefined) {
      updateData.level = data.level ?? null;
    }
    if (data.bio !== undefined) {
      updateData.bio = bio;
    }

    if (data.preferred_tutor_personality) {
      updateData.preferred_tutor_personality = data.preferred_tutor_personality;
    }
    if (data.theme_preference) {
      updateData.theme_preference = data.theme_preference;
    }
    if (data.content_density) {
      updateData.content_density = data.content_density;
    }
    if (data.notification_preferences) {
      updateData.notification_preferences = data.notification_preferences;
    }

    await db.collection('users').doc(userId).update(updateData);

    if (auth) {
      await auth.updateUser(userId, {
        displayName: resolvedFullName,
      });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const profileData = userDoc.data();

    const response: UpdateProfileResponse = {
      success: true,
      profile: {
        id: userId,
        email: profileData?.email ?? '',
        full_name: profileData?.full_name ?? resolvedFullName,
        bio: profileData?.bio ?? null,
        is_admin: Boolean(profileData?.is_admin),
        theme_preference: profileData?.theme_preference ?? 'dark',
        content_density: profileData?.content_density ?? 'comfortable',
        notification_preferences: {
          due_cards: profileData?.notification_preferences?.due_cards ?? true,
          streaks: profileData?.notification_preferences?.streaks ?? true,
          exam_countdowns: profileData?.notification_preferences?.exam_countdowns ?? true,
          workspace_invitations:
            profileData?.notification_preferences?.workspace_invitations ?? true,
        },
        matric_number: profileData?.matric_number ?? null,
        department: profileData?.department ?? null,
        level: typeof profileData?.level === 'number' ? profileData.level : null,
        subscription_status: profileData?.subscription_status ?? 'inactive',
        subscription_tier: profileData?.subscription_tier ?? 'free',
        paid_until: profileData?.paid_until?.toDate?.()?.toISOString?.() ?? null,
        free_explanations_used: profileData?.free_explanations_used ?? 0,
        free_explanations_limit: profileData?.free_explanations_limit ?? 0,
        free_ai_queries_used: profileData?.free_ai_queries_used ?? 0,
        free_ai_queries_limit: profileData?.free_ai_queries_limit ?? 0,
        current_streak: profileData?.current_streak ?? 0,
        total_xp: profileData?.total_xp ?? 0,
        preferred_tutor_personality:
          (profileData?.preferred_tutor_personality as TutorPersonality | undefined) ?? 'mentor',
        referral_code: profileData?.referral_code ?? '',
        referral_credits: profileData?.referral_credits ?? 0,
      },
    };

    return successResponse(response);
  } catch (updateError: unknown) {
    console.error('Update profile error:', updateError);
    return errorResponse('Failed to update profile', StatusCodes.INTERNAL_ERROR);
  }
});

export const DELETE = withAuth(async (request, { db, userId, user }) => {
  const { data, error } = await parseBodyWithZod(request, DeleteProfileSchema);

  if (error) {
    return error;
  }

  if (!data) {
    return errorResponse('Invalid account deletion payload', StatusCodes.BAD_REQUEST);
  }

  if (!user.email || data.email.toLowerCase() !== user.email.toLowerCase()) {
    return errorResponse(
      'Email confirmation does not match the signed-in account.',
      StatusCodes.BAD_REQUEST,
    );
  }

  try {
    const ownedWorkspaces = await db.collection('workspaces').where('user_id', '==', userId).get();

    for (const workspaceDoc of ownedWorkspaces.docs) {
      await deleteWorkspaceGraph(db, workspaceDoc.id);
    }

    await deleteQueryInChunks(db.collection('workspace_members').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('payments').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('user_progress').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('tutor_messages').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('study_sessions').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('study_exams').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('study_plans').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('flashcards').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('quizzes').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('exams').where('user_id', '==', userId));
    await deleteQueryInChunks(db.collection('workspace_invites').where('created_by', '==', userId));

    await db
      .collection('usage_stats')
      .doc(userId)
      .delete()
      .catch(() => undefined);
    await db
      .collection('users')
      .doc(userId)
      .delete()
      .catch(() => undefined);

    const auth = getAdminAuth();
    if (auth) {
      await auth.deleteUser(userId);
    }

    await clearSessionCookie();

    const response: DeleteProfileResponse = { success: true };
    return successResponse(response);
  } catch (deleteError: unknown) {
    console.error('Delete profile error:', deleteError);
    return errorResponse('Failed to delete account', StatusCodes.INTERNAL_ERROR);
  }
});
