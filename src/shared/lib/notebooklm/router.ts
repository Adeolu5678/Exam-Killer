import { FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';

import { NlmAccount } from './types';

export type JobType = 'query' | 'audio' | 'video';

/**
 * Selects the best profile from the pool based on usage ratio.
 */
export async function selectProfile(jobType: JobType): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const snapshot = await db.collection('notebooklm_accounts').where('is_active', '==', true).get();

  if (snapshot.empty) {
    throw new Error('NLM_QUOTA_EXHAUSTED');
  }

  const accounts = snapshot.docs.map((doc) => doc.data() as NlmAccount);

  const eligible = accounts.filter((account) => {
    switch (jobType) {
      case 'query':
        return account.daily_queries_used < account.daily_quota_queries;
      case 'audio':
        return account.daily_audio_used < account.daily_quota_audio;
      case 'video':
        return account.daily_video_used < account.daily_quota_video;
      default:
        return false;
    }
  });

  if (eligible.length === 0) {
    throw new Error('NLM_QUOTA_EXHAUSTED');
  }

  // Sort by lowest usage ratio: used / quota ascending
  eligible.sort((a, b) => {
    const ratioA = getUsageRatio(a, jobType);
    const ratioB = getUsageRatio(b, jobType);
    return ratioA - ratioB;
  });

  return eligible[0].profile_name;
}

function getUsageRatio(account: NlmAccount, jobType: JobType): number {
  switch (jobType) {
    case 'query':
      return account.daily_queries_used / account.daily_quota_queries;
    case 'audio':
      return account.daily_audio_used / account.daily_quota_audio;
    case 'video':
      return account.daily_video_used / account.daily_quota_video;
    default:
      return 1;
  }
}

/**
 * Increments usage for a specific profile and job type.
 * Sets is_active to false if quota is reached.
 */
export async function incrementUsage(profileName: string, jobType: JobType): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const docRef = db.collection('notebooklm_accounts').doc(profileName);

  const fieldMap: Record<JobType, string> = {
    query: 'daily_queries_used',
    audio: 'daily_audio_used',
    video: 'daily_video_used',
  };

  const field = fieldMap[jobType];

  const doc = await docRef.get();
  if (!doc.exists) throw new Error(`Account ${profileName} not found`);

  const data = doc.data() as NlmAccount;
  const newUsed = (data[field as keyof NlmAccount] as number) + 1;

  const quotaFieldMap: Record<JobType, keyof NlmAccount> = {
    query: 'daily_quota_queries',
    audio: 'daily_quota_audio',
    video: 'daily_quota_video',
  };
  const quotaField = quotaFieldMap[jobType];
  const quota = data[quotaField] as number;

  const updateData: any = {
    [field]: FieldValue.increment(1),
  };

  if (newUsed >= quota) {
    updateData.is_active = false;
  }

  await docRef.update(updateData);
}

/**
 * Manually mark an account as inactive (e.g., on auth failure).
 */
export async function markAccountInactive(profileName: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');
  await db.collection('notebooklm_accounts').doc(profileName).update({ is_active: false });
}
