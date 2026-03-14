import { NextRequest, NextResponse } from 'next/server';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import {
  getCurrentUser,
  createSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '@/shared/lib/firebase/server-auth';
import { SessionResponse } from '@/shared/types/api';

export async function GET(): Promise<NextResponse<SessionResponse>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ authenticated: false });
    }

    const userDoc = await db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ authenticated: false });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.uid,
        email: user.email || '',
        full_name: userData?.full_name || user.displayName || '',
        subscription_status: userData?.subscription_status || 'free',
        paid_until: userData?.paid_until?.toDate?.()?.toISOString() || null,
        preferred_tutor_personality: userData?.preferred_tutor_personality || 'mentor',
        current_streak: userData?.current_streak || 0,
        total_xp: userData?.total_xp || 0,
      },
    });
  } catch (error: unknown) {
    console.error('Session check error:', error);

    return NextResponse.json({ authenticated: false });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Invalid idToken' }, { status: 400 });
    }

    await setSessionCookie(idToken);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Session creation error:', error);

    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Session deletion error:', error);

    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
