import { Timestamp } from 'firebase-admin/firestore';

import type { ViewerProfile, ViewerSession, ViewerUsage } from '@/domains/users/contracts/viewer';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import { getCurrentUser, getDecodedToken, clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import { getUserSubscription, getUserUsageStats } from '@/shared/lib/paystack/db';
import { ConfigurationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

interface UserRecordData {
  full_name?: string;
  bio?: string | null;
  matric_number?: string | null;
  department?: string | null;
  level?: number | null;
  is_admin?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  content_density?: 'comfortable' | 'compact';
  preferred_tutor_personality?: string;
  current_streak?: number;
  total_xp?: number;
}

function mapUsage(usage: Awaited<ReturnType<typeof getUserUsageStats>>): ViewerUsage {
  return {
    workspaces_count: usage.workspacesCount,
    file_uploads_this_month: usage.fileUploadsThisMonth,
    ai_queries_today: usage.aiQueriesToday,
    flashcards_count: usage.flashcardsCount,
  };
}

async function loadViewerProfile(userId: string, email: string, displayName: string, photoUrl: string | null) {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }

  const userDoc = await db.collection('users').doc(userId).get();
  const data = (userDoc.data() ?? {}) as UserRecordData;
  const subscription = await getUserSubscription(userId);
  const usage = await getUserUsageStats(userId);

  const profile: ViewerProfile = {
    id: userId,
    email,
    full_name: data.full_name ?? displayName,
    display_name: displayName,
    photo_url: photoUrl,
    bio: data.bio ?? null,
    matric_number: data.matric_number ?? null,
    department: data.department ?? null,
    level: typeof data.level === 'number' ? data.level : null,
    is_admin: Boolean(data.is_admin),
    preferences: {
      theme_preference: data.theme_preference ?? 'dark',
      content_density: data.content_density ?? 'comfortable',
    },
    preferred_tutor_personality: data.preferred_tutor_personality ?? 'mentor',
    subscription: {
      plan: subscription?.plan ?? 'free',
      status: subscription?.status ?? 'inactive',
      current_period_end: subscription?.currentPeriodEnd?.toISOString() ?? null,
      is_trial: Boolean(subscription?.isTrial),
      has_had_trial: Boolean(subscription?.hasHadTrial),
      paystack_authorization_code: subscription?.paystackAuthorizationCode ?? null,
      institution: subscription?.institution ?? null,
      verification_status: subscription?.verificationStatus ?? 'none',
      verification_media_url: subscription?.verificationMediaUrl ?? null,
      verification_submitted_at: subscription?.verificationSubmittedAt?.toISOString() ?? null,
    },
    usage: mapUsage(usage),
    current_streak: data.current_streak ?? 0,
    total_xp: data.total_xp ?? 0,
  };

  return profile;
}

export async function getViewerSession(): Promise<ViewerSession> {
  const authUser = await getCurrentUser();
  const decodedToken = await getDecodedToken();

  if (!authUser || !decodedToken) {
    return {
      status: 'anonymous',
      session_expires_at: null,
      viewer: null,
    };
  }

  try {
    const viewer = await loadViewerProfile(
      authUser.uid,
      authUser.email ?? '',
      authUser.displayName ?? authUser.email ?? 'User',
      authUser.photoURL,
    );

    return {
      status: 'authenticated',
      session_expires_at: new Date(decodedToken.exp * 1000).toISOString(),
      viewer,
    };
  } catch (error) {
    appLogger.error('Failed to resolve viewer session', error, { userId: authUser.uid });
    return {
      status: 'anonymous',
      session_expires_at: null,
      viewer: null,
    };
  }
}

export async function destroyViewerSession(): Promise<void> {
  await clearSessionCookie();
}
