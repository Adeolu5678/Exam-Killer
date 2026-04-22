'use client';

import { useContext } from 'react';

import type { User } from 'firebase/auth';

import { AuthContext } from '@/context/AuthContext';
import type { RegisterInput, SubscriptionInfo, UsageInfo } from '@/context/AuthContext';
import type { ViewerProfile } from '@/domains/users/contracts/viewer';

interface UseAuthReturn {
  user: User | null;
  viewer: ViewerProfile | null;
  sessionStatus: 'authenticated' | 'anonymous';
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

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
