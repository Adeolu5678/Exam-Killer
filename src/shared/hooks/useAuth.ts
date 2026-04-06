'use client';

import { useContext } from 'react';

import type { AuthError, User } from 'firebase/auth';

import { AuthContext } from '@/context/AuthContext';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  subscription: {
    plan: 'free' | 'premium_monthly' | 'premium_annual';
    status: 'active' | 'inactive' | 'past_due';
    currentPeriodEnd?: Date | string;
    isTrial?: boolean;
    hasHadTrial?: boolean;
    paystackAuthorizationCode?: string;
    matricNumber?: string;
    institution?: string;
    verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
    verificationMediaUrl?: string;
    verificationSubmittedAt?: Date;
  } | null;
  usage: {
    workspacesCount: number;
    fileUploadsThisMonth: number;
    aiQueriesToday: number;
    flashcardsCount: number;
  } | null;
  canUseFeature: (feature: string) => boolean;
  isLoadingSubscription: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, loading, ...rest } = context;

  return {
    ...rest,
    user,
    loading,
    isAuthenticated: !!user && !loading,
  };
}
