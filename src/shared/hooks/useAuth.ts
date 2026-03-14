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
