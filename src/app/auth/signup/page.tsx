'use client';

import { useEffect, useState, type FormEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/shared/hooks/useAuth';
import { isFirebaseConfigured } from '@/shared/lib/firebase/client';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  matricNumber: string;
  department: string;
  level: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  general?: string;
}

const levels = ['100', '200', '300', '400', '500', '600', '700'];

function FirebaseNotConfigured() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Create account</h2>
        <p className="mt-1 text-sm text-indigo-200">Start your exam preparation journey</p>
      </div>

      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-4 py-3 text-sm text-yellow-200">
        <p className="font-medium">Firebase is not configured</p>
        <p className="mt-1 text-yellow-300/80">
          Please set up your Firebase environment variables to enable authentication.
        </p>
      </div>

      <p className="text-center text-sm text-indigo-200">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    matricNumber: '',
    department: '',
    level: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { register, loginWithGoogle, isAuthenticated, loading, error, clearError } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (!isFirebaseConfigured) {
    return <FirebaseNotConfigured />;
  }

  if (isAuthenticated && !loading) {
    return null;
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and a number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignup = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        matric_number: formData.matricNumber || null,
        department: formData.department || null,
        level: formData.level ? parseInt(formData.level, 10) : null,
      });

      router.push('/dashboard');
    } catch (signupError: unknown) {
      const errorMessage = signupError instanceof Error ? signupError.message : 'Signup failed';
      if (errorMessage.includes('email-already-in-use') || errorMessage.includes('already exists')) {
        setErrors({ general: 'An account with this email already exists' });
      } else if (errorMessage.includes('weak-password')) {
        setErrors({ password: 'Password is too weak' });
      } else if (errorMessage.includes('invalid-email')) {
        setErrors({ email: 'Invalid email address' });
      } else {
        setErrors({ general: 'Failed to create account. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    clearError();
    setIsLoading(true);
    setErrors({});

    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (signupError: unknown) {
      const errorMessage = signupError instanceof Error ? signupError.message : 'Unknown error occurred';
      setErrors({ general: `Failed to sign up with Google: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Create account</h2>
        <p className="mt-1 text-sm text-indigo-200">Start your exam preparation journey</p>
      </div>

      {(errors.general ?? error?.message) && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-3 text-sm text-red-200">
          {errors.general ?? error?.message}
        </div>
      )}

      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-indigo-200">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.fullName ? 'border-red-500' : 'border-white/20'}`}
              placeholder="John Doe"
              disabled={isLoading}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
          </div>

          <div className="col-span-2">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-indigo-200">
              Email address <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.email ? 'border-red-500' : 'border-white/20'}`}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-indigo-200">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.password ? 'border-red-500' : 'border-white/20'}`}
              placeholder="Min 8 characters"
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-indigo-200">
              Confirm password <span className="text-red-400">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={`w-full rounded-lg border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.confirmPassword ? 'border-red-500' : 'border-white/20'}`}
              placeholder="Confirm password"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="matricNumber" className="mb-1 block text-sm font-medium text-indigo-200">
              Matric number
            </label>
            <input
              id="matricNumber"
              type="text"
              value={formData.matricNumber}
              onChange={(e) => handleChange('matricNumber', e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. CSC/2022/001"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="department" className="mb-1 block text-sm font-medium text-indigo-200">
              Department
            </label>
            <input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-indigo-300 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Computer Science"
              disabled={isLoading}
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="level" className="mb-1 block text-sm font-medium text-indigo-200">
              Level
            </label>
            <select
              id="level"
              value={formData.level}
              onChange={(e) => handleChange('level', e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              <option value="" className="bg-indigo-900">
                Select level
              </option>
              {levels.map((level) => (
                <option key={level} value={level} className="bg-indigo-900">
                  {level} Level
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
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
        onClick={handleGoogleSignup}
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
        Sign up with Google
      </button>

      <p className="text-center text-sm text-indigo-200">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
