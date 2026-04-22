import { getAdminDb } from '@/shared/lib/firebase/admin';
import { getCurrentUser } from '@/shared/lib/firebase/server-auth';

import { AuthenticationError, AuthorizationError, ConfigurationError } from './errors';

export async function requireAdminUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }

  const userSnapshot = await db.collection('users').doc(user.uid).get();
  if (!userSnapshot.exists || userSnapshot.data()?.is_admin !== true) {
    throw new AuthorizationError('Admin access required');
  }

  return user.uid;
}
