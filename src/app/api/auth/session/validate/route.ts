import { NextRequest } from 'next/server';

import { errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { verifySessionCookie } from '@/shared/lib/firebase/server-auth';

const SESSION_COOKIE_NAME = 'session';

export async function GET(request: NextRequest): Promise<Response> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return successResponse({ authenticated: false });
  }

  const decoded = await verifySessionCookie(sessionCookie);
  if (!decoded) {
    return successResponse({ authenticated: false });
  }

  return successResponse({ authenticated: true, uid: decoded.uid });
}

export async function POST(): Promise<Response> {
  return errorResponse('Method not allowed', StatusCodes.BAD_REQUEST);
}
