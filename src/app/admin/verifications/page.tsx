'use client';

import { useState, useEffect } from 'react';

import Image from 'next/image';

import { Check, X, ExternalLink, User } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Spinner,
} from '@/shared/ui';

interface VerificationRequest {
  uid: string;
  email?: string;
  institution?: string;
  matric_number?: string;
  verification_media_url?: string;
  verification_submitted_at?: string | { seconds: number };
}

interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ApiErrorEnvelope {
  success: false;
  error?: {
    message?: string;
  };
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<'allowed' | 'unauthorized' | 'forbidden'>(
    'allowed',
  );

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/verification/admin');
      const payload = (await res.json()) as ApiEnvelope<{ verifications: VerificationRequest[] }>;
      if (res.status === 401) {
        setAccessState('unauthorized');
        throw new Error('Sign in to review verification requests.');
      }
      if (res.status === 403) {
        setAccessState('forbidden');
        throw new Error('Your account does not have admin access to this page.');
      }
      setAccessState('allowed');
      if (!res.ok || !payload.success) {
        throw new Error(payload.success ? 'Failed to fetch verifications' : payload.error?.message);
      }
      setVerifications(payload.data.verifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (targetUserId: string, status: 'verified' | 'rejected') => {
    setActioningId(targetUserId);
    setError(null);
    try {
      const res = await fetch('/api/v1/verification/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, status }),
      });
      const payload = (await res.json()) as ApiEnvelope<{ reviewed: boolean }>;
      if (res.status === 401) {
        setAccessState('unauthorized');
        throw new Error('Your session expired. Sign in again to continue.');
      }
      if (res.status === 403) {
        setAccessState('forbidden');
        throw new Error('Only admin accounts can review verification requests.');
      }
      if (!res.ok || !payload.success) {
        throw new Error(payload.success ? 'Action failed' : payload.error?.message);
      }

      // Remove from list
      setVerifications((prev) => prev.filter((v) => v.uid !== targetUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Identity Verifications</h1>
          <p className="text-gray-500">
            Review student ID cards and portal screenshots before granting verification.
          </p>
        </div>
        <Button onClick={fetchVerifications} variant="ghost">
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-600">
          <p className="font-medium">
            {accessState === 'forbidden'
              ? 'Admin access required'
              : accessState === 'unauthorized'
                ? 'Authentication required'
                : 'Unable to load verification queue'}
          </p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : verifications.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">No pending verifications found.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {verifications.map((v) => (
            <Card key={v.uid} className="flex flex-col overflow-hidden">
              <div className="group relative h-48 bg-gray-100">
                {v.verification_media_url ? (
                  <>
                    <Image
                      src={v.verification_media_url}
                      alt="Verification Doc"
                      fill
                      className="object-cover"
                      unoptimized // Since it's from Firebase Storage or similar, we might need this or configure remotePatterns
                    />
                    <a
                      href={v.verification_media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ExternalLink className="h-6 w-6 text-white" />
                    </a>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    No Image Provided
                  </div>
                )}
              </div>

              <CardHeader className="pb-2">
                <div className="mb-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="truncate text-sm font-medium">{v.email || 'Unknown User'}</span>
                </div>
                <CardTitle className="text-lg">{v.institution}</CardTitle>
                <CardDescription>
                  Matric: <span className="font-mono text-gray-900">{v.matric_number}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <Badge variant="outline" className="text-xs">
                  Pending Review
                </Badge>
              </CardContent>

              <div className="flex gap-2 border-t bg-gray-50 p-4">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                  disabled={!!actioningId}
                  onClick={() => handleReview(v.uid, 'verified')}
                >
                  {actioningId === v.uid ? (
                    <Spinner size="sm" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  size="sm"
                  disabled={!!actioningId}
                  onClick={() => handleReview(v.uid, 'rejected')}
                >
                  {actioningId === v.uid ? <Spinner size="sm" /> : <X className="mr-1 h-4 w-4" />}
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
