import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import { LogoutResponse } from '@/shared/types/api';

export async function POST(): Promise<NextResponse<LogoutResponse>> {
  try {
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Logout error:', error);

    return NextResponse.json({ success: true });
  }
}
