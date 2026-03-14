'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type AuthError,
} from 'firebase/auth';

import { auth, googleProvider, isFirebaseConfigured } from '@/shared/lib/firebase/client';
import type {
  SubscriptionPlan,
  UserSubscription,
  UsageStats,
} from '@/shared/lib/paystack/subscription';
import { SUBSCRIPTION_PLANS } from '@/shared/lib/paystack/subscription';

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: 'active' | 'inactive' | 'past_due';
  currentPeriodEnd?: Date;
}

interface UsageInfo {
  workspacesCount: number;
  fileUploadsThisMonth: number;
  aiQueriesToday: number;
  flashcardsCount: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  subscription: SubscriptionInfo | null;
  usage: UsageInfo | null;
  canUseFeature: (feature: string) => boolean;
  isLoadingSubscription: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

async function setSessionCookie(idToken: string): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to set session cookie');
  }
}

async function clearSessionCookie(): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear session cookie');
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          await setSessionCookie(idToken);
        } catch {
          console.error('Failed to set session cookie');
        }
      } else {
        try {
          await clearSessionCookie();
        } catch (err) {
          console.error('Failed to clear session cookie', err);
        }
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoadingSubscription(true);
      fetch('/api/payments/status')
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch subscription status');
          }
          return res.json();
        })
        .then((data) => {
          setSubscription(data.subscription);
          setUsage(data.usage);
        })
        .catch((err) => {
          console.error('Failed to fetch subscription:', err);
          setSubscription(null);
          setUsage(null);
        })
        .finally(() => setIsLoadingSubscription(false));
    } else {
      setSubscription(null);
      setUsage(null);
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured');
    }
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      await setSessionCookie(idToken);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured');
    }
    setError(null);
    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      await setSessionCookie(idToken);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error('Firebase is not configured');
    }
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await setSessionCookie(idToken);
    } catch (err) {
      setError(err as AuthError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured');
    }
    setError(null);

    try {
      await firebaseSignOut(auth);
      await clearSessionCookie();
    } catch (err) {
      setError(err as AuthError);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const canUseFeature = useCallback(
    (feature: string): boolean => {
      if (!subscription) {
        return false;
      }

      if (subscription.plan === 'free') {
        const freePlan = SUBSCRIPTION_PLANS.free.features;

        switch (feature) {
          case 'workspaces':
            if (typeof freePlan.workspaces === 'number' && usage) {
              return usage.workspacesCount < freePlan.workspaces;
            }
            return false;
          case 'fileUploads':
            if (typeof freePlan.fileUploads === 'number' && usage) {
              return usage.fileUploadsThisMonth < freePlan.fileUploads;
            }
            return false;
          case 'aiQueriesPerDay':
            if (typeof freePlan.aiQueriesPerDay === 'number' && usage) {
              return usage.aiQueriesToday < freePlan.aiQueriesPerDay;
            }
            return false;
          case 'flashcards':
            if (typeof freePlan.flashcards === 'number' && usage) {
              return usage.flashcardsCount < freePlan.flashcards;
            }
            return false;
          default:
            return false;
        }
      }

      return subscription.status === 'active';
    },
    [subscription, usage],
  );

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    signup,
    loginWithGoogle,
    logout,
    clearError,
    subscription,
    usage,
    canUseFeature,
    isLoadingSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
