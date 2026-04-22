import { Timestamp } from 'firebase-admin/firestore';

import type { SignupRequestInput } from '@/domains/auth/contracts/session';

import { getAdminAuth, getAdminDb } from '@/shared/lib/firebase/admin';
import { ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface CreateUserDocumentData {
  uid: string;
  email: string;
  full_name: string;
  matric_number: string | null;
  department: string | null;
  level: number | null;
  subscription_status: 'inactive';
  subscription_tier: 'free';
  paid_until: null;
  free_explanations_used: number;
  free_ai_queries_used: number;
  free_ai_queries_limit: number;
  current_streak: number;
  total_xp: number;
  preferred_tutor_personality: 'mentor';
  referral_code: string;
  referral_credits: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let index = 0; index < 8; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export async function bootstrapViewerProfile(input: SignupRequestInput): Promise<{ id: string; email: string }> {
  const auth = getAdminAuth();
  const db = getAdminDb();

  if (!auth || !db) {
    throw new ConfigurationError('Firebase Admin is not initialized');
  }

  try {
    const userRecord = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.full_name,
    });

    const userDocData: CreateUserDocumentData = {
      uid: userRecord.uid,
      email: userRecord.email ?? input.email,
      full_name: input.full_name,
      matric_number: input.matric_number ?? null,
      department: input.department ?? null,
      level: input.level ?? null,
      subscription_status: 'inactive',
      subscription_tier: 'free',
      paid_until: null,
      free_explanations_used: 0,
      free_ai_queries_used: 0,
      free_ai_queries_limit: 5,
      current_streak: 0,
      total_xp: 0,
      preferred_tutor_personality: 'mentor',
      referral_code: generateReferralCode(),
      referral_credits: 0,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };

    if (input.referral_code) {
      const referrerQuery = await db
        .collection('users')
        .where('referral_code', '==', input.referral_code)
        .limit(1)
        .get();

      if (!referrerQuery.empty) {
        const referrerDoc = referrerQuery.docs[0];
        await referrerDoc.ref.update({
          referral_credits: (referrerDoc.data().referral_credits || 0) + 1,
        });
        userDocData.referral_credits = 1;
      }
    }

    await db.collection('users').doc(userRecord.uid).set(userDocData);

    return {
      id: userRecord.uid,
      email: userRecord.email ?? input.email,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };

      if (firebaseError.code === 'auth/email-already-exists') {
        throw new ValidationError('An account with this email already exists');
      }

      if (firebaseError.code === 'auth/invalid-email') {
        throw new ValidationError('Invalid email address');
      }

      if (firebaseError.code === 'auth/weak-password') {
        throw new ValidationError('Password is too weak');
      }
    }

    throw error;
  }
}
