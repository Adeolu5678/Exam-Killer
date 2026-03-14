'use client';

import { useState, FormEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/shared/hooks/useAuth';
import { isFirebaseConfigured } from '@/shared/lib/firebase/client';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function FirebaseNotConfigured() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-1 text-sm text-indigo-200">Sign in to your account</p>
      </div>

      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-4 py-3 text-sm text-yellow-200">
        <p className="font-medium">Firebase is not configured</p>
        <p className="mt-1 text-yellow-300/80">
          Please set up your Firebase environment variables to enable authentication.
        </p>
      </div>

      <p className="text-center text-sm text-indigo-200">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();

  if (!isFirebaseConfigured) {
    return <FirebaseNotConfigured />;
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      if (errorMessage.includes('user-not-found')) {
        setErrors({ general: 'No account found with this email' });
      } else if (errorMessage.includes('wrong-password')) {
        setErrors({ general: 'Incorrect password' });
      } else if (errorMessage.includes('invalid-credential')) {
        setErrors({ general: 'Invalid email or password' });
      } else {
        setErrors({ general: 'Failed to sign in. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrors({ general: `Failed to sign in with Google: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-1 text-sm text-indigo-200">Sign in to your account</p>
      </div>

      {errors.general && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-indigo-200">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full border bg-white/5 px-4 py-3 ${errors.email ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="you@example.com"
            disabled={isLoading}
          />
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-indigo-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full border bg-white/5 px-4 py-3 ${errors.password ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-transparent px-4 text-indigo-300">Or continue with</span>
        </div>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-medium text-white transition duration-200 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </button>

      <p className="text-center text-sm text-indigo-200">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
