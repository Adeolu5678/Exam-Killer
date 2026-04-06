import { NextRequest } from 'next/server';

import { errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import {
  getCurrentUser,
  createSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '@/shared/lib/firebase/server-auth';
import { SessionResponse } from '@/shared/types/api';

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return successResponse({ authenticated: false });
    }

    const db = getAdminDb();
    if (!db) {
      return successResponse({ authenticated: false });
    }

    const userDoc = await db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      return successResponse({ authenticated: false });
    }

    const userData = userDoc.data();

    return successResponse({
      authenticated: true,
      user: {
        id: user.uid,
        email: user.email || '',
        full_name: userData?.full_name || user.displayName || '',
        subscription_status: userData?.subscription_status || 'inactive',
        paid_until: userData?.paid_until?.toDate?.()?.toISOString() || null,
        preferred_tutor_personality: userData?.preferred_tutor_personality || 'mentor',
        current_streak: userData?.current_streak || 0,
        total_xp: userData?.total_xp || 0,
      },
    });
  } catch (error: unknown) {
    console.error('Session check error:', error);

    return successResponse({ authenticated: false });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return errorResponse('Invalid idToken', StatusCodes.BAD_REQUEST);
    }

    await setSessionCookie(idToken);

    return successResponse({ success: true });
  } catch (error: unknown) {
    console.error('Session creation error:', error);

    return errorResponse('Failed to create session', StatusCodes.INTERNAL_ERROR);
  }
}

export async function DELETE(): Promise<Response> {
  try {
    await clearSessionCookie();

    return successResponse({ success: true });
  } catch (error: unknown) {
    console.error('Session deletion error:', error);

    return errorResponse('Failed to clear session', StatusCodes.INTERNAL_ERROR);
  }
}
