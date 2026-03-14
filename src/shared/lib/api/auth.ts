/**
 * Authentication middleware helpers for API routes
 *
 * Provides standardized auth checking patterns to reduce code duplication
 * across API routes and ensure consistent error responses.
 */

import { NextRequest, NextResponse } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { getAdminDb, getAdminAuth } from '@/shared/lib/firebase/admin';
import { getCurrentUser, AuthUser } from '@/shared/lib/firebase/server-auth';

// Standard error responses
export const AuthErrors = {
  UNAUTHORIZED: { error: 'Unauthorized' },
  CONFIG_ERROR: { error: 'Server configuration error' },
  FORBIDDEN: { error: 'Forbidden' },
  SUBSCRIPTION_LIMIT_EXCEEDED: {
    error: 'Limit reached',
    message: 'You have reached your limit. Upgrade to Premium for more!',
  },
} as const;

// HTTP status codes
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

export interface AuthContext {
  user: AuthUser;
  db: Firestore;
  userId: string;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API handler with authentication and database validation
 *
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (req, { user, db, userId }) => {
 *   // Your handler logic here
 *   return NextResponse.json({ data: 'success' });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      // Check authentication
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: StatusCodes.UNAUTHORIZED });
      }

      // Check database configuration
      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(AuthErrors.CONFIG_ERROR, { status: StatusCodes.INTERNAL_ERROR });
      }

      // Call the handler with auth context
      return await handler(req, { user, db, userId: user.uid });
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: StatusCodes.INTERNAL_ERROR },
      );
    }
  };
}

/**
 * Wraps an API handler with admin-only authentication
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: StatusCodes.UNAUTHORIZED });
      }

      const db = getAdminDb();
      if (!db) {
        return NextResponse.json(AuthErrors.CONFIG_ERROR, { status: StatusCodes.INTERNAL_ERROR });
      }

      // 🚨 Admin check: Fetch user doc to check is_admin flag
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data();

      if (!userData?.is_admin) {
        return NextResponse.json(AuthErrors.FORBIDDEN, { status: StatusCodes.FORBIDDEN });
      }

      return await handler(req, { user, db, userId: user.uid });
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: StatusCodes.INTERNAL_ERROR },
      );
    }
  };
}
/**
 * Wraps an API handler that requires auth but may handle unauthenticated users differently
 *
 * Usage:
 * ```typescript
 * export const GET = withOptionalAuth(async (req, context) => {
 *   if (!context) {
 *     // Handle unauthenticated case
 *     return NextResponse.json({ public: true });
 *   }
 *   // Handle authenticated case
 *   return NextResponse.json({ userId: context.userId });
 * });
 * ```
 */
export function withOptionalAuth(
  handler: (req: NextRequest, context: AuthContext | null) => Promise<NextResponse> | NextResponse,
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      const user = await getCurrentUser();
      const db = getAdminDb();

      if (!user || !db) {
        return await handler(req, null);
      }

      return await handler(req, { user, db, userId: user.uid });
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: StatusCodes.INTERNAL_ERROR },
      );
    }
  };
}

/**
 * Validates that the authenticated user owns a resource or is an admin
 *
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (req, context) => {
 *   const resource = await getResource(params.id);
 *
 *   if (!requireOwnership(context, resource.owner_id)) {
 *     return NextResponse.json(AuthErrors.FORBIDDEN, { status: StatusCodes.FORBIDDEN });
 *   }
 *
 *   // User owns the resource
 * });
 * ```
 */
export function requireOwnership(context: AuthContext, ownerId: string): boolean {
  return context.userId === ownerId;
}

/**
 * Higher-order function to require resource ownership
 *
 * Usage:
 * ```typescript
 * export const GET = withAuth(
 *   withOwnership(
 *     async (req, context, resource) => {
 *       // Handler with guaranteed ownership
 *     },
 *     (req) => getResourceOwnerId(req) // Function to extract owner ID
 *   )
 * );
 * ```
 */
export function withOwnership<T>(
  handler: (
    req: NextRequest,
    context: AuthContext,
    resource: T,
  ) => Promise<NextResponse> | NextResponse,
  getResource: (req: NextRequest, context: AuthContext) => Promise<T | null>,
  getOwnerId: (resource: T) => string,
) {
  return async function (req: NextRequest, context: AuthContext): Promise<NextResponse> {
    const resource = await getResource(req, context);

    if (!resource) {
      return NextResponse.json({ error: 'Not found' }, { status: StatusCodes.NOT_FOUND });
    }

    const ownerId = getOwnerId(resource);

    if (!requireOwnership(context, ownerId)) {
      return NextResponse.json(AuthErrors.FORBIDDEN, { status: StatusCodes.FORBIDDEN });
    }

    return handler(req, context, resource);
  };
}

/**
 * Standardized success response helper
 */
export function successResponse<T>(data: T, status: number = StatusCodes.OK): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Standardized error response helper
 */
export function errorResponse(
  message: string,
  status: number = StatusCodes.INTERNAL_ERROR,
  details?: Record<string, unknown>,
): NextResponse {
  const body: Record<string, unknown> = { error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Parse and validate JSON body with Zod schema
 * Returns { data, error } where error is a formatted NextResponse if validation fails
 */
export async function parseBodyWithZod<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> | null; error: NextResponse | null }> {
  try {
    const body = await req.json();
    const result = await schema.safeParseAsync(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return {
        data: null,
        error: errorResponse(`Validation failed: ${errorMessage}`, StatusCodes.BAD_REQUEST, {
          issues: result.error.issues,
        }),
      };
    }

    return { data: result.data, error: null };
  } catch (err) {
    return {
      data: null,
      error: errorResponse('Invalid JSON body', StatusCodes.BAD_REQUEST),
    };
  }
}

/**
 * @deprecated Use parseBodyWithZod instead for strict validation.
 * Parse and validate JSON body from request
 * Returns null if parsing fails
 */
export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * @deprecated Use Zod schemas instead
 * Validate required fields in request body
 * Returns array of missing field names
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[],
): string[] {
  return requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });
}

/**
 * @deprecated Use Zod schemas and parseBodyWithZod error handling instead
 * Common validation error response
 */
export function validationError(missingFields: string[]): NextResponse {
  return errorResponse(
    `Missing required fields: ${missingFields.join(', ')}`,
    StatusCodes.BAD_REQUEST,
  );
}
