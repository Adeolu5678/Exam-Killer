import { NextRequest, NextResponse } from 'next/server';

import { getAdminAuth, getAdminDb } from '@/shared/lib/firebase/admin';
import { SignupRequest, SignupResponse } from '@/shared/types/api';
import { TutorPersonality, SubscriptionStatus } from '@/shared/types/database';

interface CreateUserDocumentData {
  uid: string;
  email: string;
  full_name: string;
  matric_number: string | null;
  department: string | null;
  level: number | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: string;
  paid_until: null;
  free_explanations_used: number;
  free_ai_queries_used: number;
  free_ai_queries_limit: number;
  current_streak: number;
  total_xp: number;
  preferred_tutor_personality: TutorPersonality;
  referral_code: string;
  referral_credits: number;
  created_at: Date;
  updated_at: Date;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest): Promise<NextResponse<SignupResponse>> {
  try {
    const body: SignupRequest = await request.json();
    const { email, password, full_name, matric_number, department, level, referral_code } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and full name are required' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 },
      );
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    if (!auth || !db) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      );
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: full_name,
    });

    const userDocData: CreateUserDocumentData = {
      uid: userRecord.uid,
      email: userRecord.email || email,
      full_name,
      matric_number: matric_number || null,
      department: department || null,
      level: level || null,
      subscription_status: 'free' as SubscriptionStatus,
      subscription_tier: 'free',
      paid_until: null,
      free_explanations_used: 0,
      free_ai_queries_used: 0,
      free_ai_queries_limit: 10,
      current_streak: 0,
      total_xp: 0,
      preferred_tutor_personality: 'mentor' as TutorPersonality,
      referral_code: generateReferralCode(),
      referral_credits: 0,
      created_at: require('firebase-admin/firestore').Timestamp.now(),
      updated_at: require('firebase-admin/firestore').Timestamp.now(),
    };

    if (referral_code) {
      const referrerQuery = await db
        .collection('users')
        .where('referral_code', '==', referral_code)
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

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.uid,
        email: userRecord.email || email,
      },
    });
  } catch (error: unknown) {
    console.error('Signup error:', error);

    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 400 },
        );
      }
      if (firebaseError.code === 'auth/invalid-email') {
        return NextResponse.json(
          { success: false, error: 'Invalid email address' },
          { status: 400 },
        );
      }
      if (firebaseError.code === 'auth/weak-password') {
        return NextResponse.json(
          { success: false, error: 'Password is too weak' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create account. Please try again.' },
      { status: 500 },
    );
  }
}
