'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  type User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import type { ViewerProfile, ViewerSession } from '@/domains/users/contracts/viewer';

import { auth, googleProvider, isFirebaseConfigured } from '@/shared/lib/firebase/client';
import {
  SUBSCRIPTION_PLANS,
  canAccessFeature,
  isFeatureKey,
  type FeatureKey,
} from '@/shared/lib/paystack/subscription';

type SubscriptionInfo = {
  plan: 'free' | 'premium_monthly' | 'premium_annual';
  status: 'active' | 'inactive' | 'past_due';
  currentPeriodEnd?: string;
  isTrial?: boolean;
  hasHadTrial?: boolean;
  paystackAuthorizationCode?: string;
  matricNumber?: string;
  institution?: string;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  verificationMediaUrl?: string;
  verificationSubmittedAt?: string;
};

type UsageInfo = {
  workspacesCount: number;
  fileUploadsThisMonth: number;
  aiQueriesToday: number;
  flashcardsCount: number;
};

interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  matric_number?: string | null;
  department?: string | null;
  level?: number | null;
  referral_code?: string | null;
}

interface AuthContextType {
  user: User | null;
  viewer: ViewerProfile | null;
  sessionStatus: ViewerSession['status'];
  sessionExpiresAt: string | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  subscription: SubscriptionInfo | null;
  usage: UsageInfo | null;
  canUseFeature: (feature: string) => boolean;
  isLoadingSubscription: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

interface LoginResponseData {
  session: {
    access_token: string;
    refresh_token: string | null;
    expires_at: number | null;
  };
  custom_token?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS_SESSION: ViewerSession = {
  status: 'anonymous',
  session_expires_at: null,
  viewer: null,
};

function normalizeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

async function readApiData<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !payload.success) {
    const message = payload && !payload.success ? payload.error.message : fallbackMessage;
    throw new Error(message);
  }

  return payload.data;
}

function toSubscriptionInfo(viewer: ViewerProfile | null): SubscriptionInfo | null {
  if (!viewer) {
    return null;
  }

  return {
    plan: viewer.subscription.plan,
    status: viewer.subscription.status,
    currentPeriodEnd: viewer.subscription.current_period_end ?? undefined,
    isTrial: viewer.subscription.is_trial,
    hasHadTrial: viewer.subscription.has_had_trial,
    paystackAuthorizationCode: viewer.subscription.paystack_authorization_code ?? undefined,
    matricNumber: viewer.matric_number ?? undefined,
    institution: viewer.subscription.institution ?? undefined,
    verificationStatus: viewer.subscription.verification_status,
    verificationMediaUrl: viewer.subscription.verification_media_url ?? undefined,
    verificationSubmittedAt: viewer.subscription.verification_submitted_at ?? undefined,
  };
}

function toUsageInfo(viewer: ViewerProfile | null): UsageInfo | null {
  if (!viewer) {
    return null;
  }

  return {
    workspacesCount: viewer.usage.workspaces_count,
    fileUploadsThisMonth: viewer.usage.file_uploads_this_month,
    aiQueriesToday: viewer.usage.ai_queries_today,
    flashcardsCount: viewer.usage.flashcards_count,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [viewerSession, setViewerSession] = useState<ViewerSession>(ANONYMOUS_SESSION);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const viewer = viewerSession.viewer;
  const subscription = useMemo(() => toSubscriptionInfo(viewer), [viewer]);
  const usage = useMemo(() => toUsageInfo(viewer), [viewer]);

  const loadViewerSession = useCallback(async (): Promise<ViewerSession> => {
    const response = await fetch('/api/v1/me', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });

    return readApiData<ViewerSession>(response, 'Failed to load session');
  }, []);

  const syncServerSession = useCallback(async (idToken: string): Promise<void> => {
    const response = await fetch('/api/v1/auth/session', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ idToken }),
    });

    await readApiData<{ success: boolean }>(response, 'Failed to sync session');
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    setSessionLoading(true);

    try {
      const session = await loadViewerSession();
      setViewerSession(session);
    } catch {
      setViewerSession(ANONYMOUS_SESSION);
    } finally {
      setSessionLoading(false);
    }
  }, [loadViewerSession]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!user || viewerSession.status === 'authenticated') {
      return undefined;
    }

    let cancelled = false;

    const ensureServerSession = async () => {
      try {
        const idToken = await user.getIdToken();
        await syncServerSession(idToken);

        if (!cancelled) {
          await refreshSession();
        }
      } catch {
        if (!cancelled) {
          setViewerSession(ANONYMOUS_SESSION);
        }
      }
    };

    void ensureServerSession();

    return () => {
      cancelled = true;
    };
  }, [refreshSession, syncServerSession, user, viewerSession.status]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setSessionLoading(true);

      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password }),
        });

        const data = await readApiData<LoginResponseData>(response, 'Failed to log in');

        if (isFirebaseConfigured && auth && data.custom_token) {
          await signInWithCustomToken(auth, data.custom_token);
        }

        const session = await loadViewerSession();
        setViewerSession(session);
      } catch (loginError) {
        setViewerSession(ANONYMOUS_SESSION);
        const normalizedError = normalizeError(loginError, 'Failed to log in');
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setSessionLoading(false);
      }
    },
    [loadViewerSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setError(null);
      setSessionLoading(true);

      try {
        const response = await fetch('/api/v1/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify(input),
        });

        await readApiData<{ user: { id: string; email: string } }>(response, 'Failed to create account');
        await login(input.email, input.password);
      } catch (signupError) {
        const normalizedError = normalizeError(signupError, 'Failed to create account');
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setSessionLoading(false);
      }
    },
    [login],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const fallbackName = email.split('@')[0]?.trim() || 'Student';

      await register({
        email,
        password,
        full_name: fallbackName,
      });
    },
    [register],
  );

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const configurationError = new Error('Google sign-in is not configured');
      setError(configurationError);
      throw configurationError;
    }

    setError(null);
    setSessionLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      await syncServerSession(idToken);

      const session = await loadViewerSession();
      setViewerSession(session);
    } catch (googleError) {
      const normalizedError = normalizeError(googleError, 'Failed to sign in with Google');
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setSessionLoading(false);
    }
  }, [loadViewerSession, syncServerSession]);

  const logout = useCallback(async () => {
    setError(null);
    setSessionLoading(true);

    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });

      await readApiData<{ success: boolean }>(response, 'Failed to log out');

      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth).catch(() => undefined);
      }

      setViewerSession(ANONYMOUS_SESSION);
    } catch (logoutError) {
      const normalizedError = normalizeError(logoutError, 'Failed to log out');
      setError(normalizedError);
      throw normalizedError;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const canUseFeature = useCallback(
    (feature: string): boolean => {
      if (!subscription || !isFeatureKey(feature)) {
        return false;
      }

      if (
        feature === 'spacedRepetition' ||
        feature === 'exportPdf' ||
        feature === 'exportAnki' ||
        feature === 'collaboration'
      ) {
        return canAccessFeature(
          {
            plan: subscription.plan,
            status: subscription.status,
            verificationStatus: subscription.verificationStatus,
          },
          feature,
        );
      }

      if (subscription.plan === 'free') {
        const freePlan = SUBSCRIPTION_PLANS.free.features;

        switch (feature) {
          case 'workspaces':
            return typeof freePlan.workspaces === 'number' && usage
              ? usage.workspacesCount < freePlan.workspaces
              : false;
          case 'fileUploads':
            return typeof freePlan.fileUploads === 'number' && usage
              ? usage.fileUploadsThisMonth < freePlan.fileUploads
              : false;
          case 'aiQueriesPerDay':
            return typeof freePlan.aiQueriesPerDay === 'number' && usage
              ? usage.aiQueriesToday < freePlan.aiQueriesPerDay
              : false;
          case 'flashcards':
            return typeof freePlan.flashcards === 'number' && usage
              ? usage.flashcardsCount < freePlan.flashcards
              : false;
          case 'tutorPersonalities':
            return freePlan.tutorPersonalities.length > 0;
          case 'analytics':
            return freePlan.analytics === 'basic' || freePlan.analytics === 'full';
          default:
            return false;
        }
      }

      return canAccessFeature(
        {
          plan: subscription.plan,
          status: subscription.status,
          verificationStatus: subscription.verificationStatus,
        },
        feature,
      );
    },
    [subscription, usage],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      viewer,
      sessionStatus: viewerSession.status,
      sessionExpiresAt: viewerSession.session_expires_at,
      loading: authLoading || sessionLoading,
      error,
      login,
      signup,
      register,
      loginWithGoogle,
      logout,
      clearError,
      subscription,
      usage,
      canUseFeature,
      isLoadingSubscription: sessionLoading,
      isAuthenticated: viewerSession.status === 'authenticated' && Boolean(viewer),
      refreshSession,
    }),
    [
      authLoading,
      canUseFeature,
      clearError,
      error,
      login,
      loginWithGoogle,
      logout,
      refreshSession,
      register,
      sessionLoading,
      signup,
      subscription,
      usage,
      user,
      viewer,
      viewerSession.session_expires_at,
      viewerSession.status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
export type { FeatureKey, RegisterInput, SubscriptionInfo, UsageInfo };
export { isFeatureKey };
