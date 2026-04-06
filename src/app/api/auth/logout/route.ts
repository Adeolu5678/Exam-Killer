import { successResponse } from '@/shared/lib/api/auth';
import { clearSessionCookie } from '@/shared/lib/firebase/server-auth';
import { LogoutResponse } from '@/shared/types/api';

export async function POST(): Promise<Response> {
  try {
    await clearSessionCookie();

    return successResponse({ success: true });
  } catch (error: unknown) {
    console.error('Logout error:', error);

    return successResponse({ success: true });
  }
}
