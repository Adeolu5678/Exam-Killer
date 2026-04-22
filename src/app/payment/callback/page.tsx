'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthContext } from '@/context/AuthContext';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

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

interface VerifyResult {
  success: boolean;
  status: 'success' | 'failed';
  message: string;
}

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reference = useMemo(
    () => searchParams.get('reference') || searchParams.get('trxref') || '',
    [searchParams],
  );

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setError('Missing payment reference');
      return;
    }

    let cancelled = false;

    const verifyPayment = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/payments/verify?reference=${encodeURIComponent(reference)}`,
        );
        const payload = (await response.json()) as ApiEnvelope<VerifyResult>;
        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? 'Payment verification failed'
              : payload.error?.message || 'Payment verification failed',
          );
        }

        if (!cancelled) {
          setResult(payload.data);
          await authContext?.refreshSession?.();
        }
      } catch (verifyError) {
        if (!cancelled) {
          setError(
            verifyError instanceof Error ? verifyError.message : 'Payment verification failed',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [authContext, reference]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Payment Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-[var(--color-text-secondary)]">Verifying your payment...</p>}

          {!loading && error && (
            <>
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex gap-2">
                <Button as={Link} href="/pricing" variant="primary">
                  Back to pricing
                </Button>
              </div>
            </>
          )}

          {!loading && !error && result?.status === 'success' && (
            <>
              <p className="text-sm text-green-600">{result.message || 'Payment verified successfully.'}</p>
              <div className="flex gap-2">
                <Button as={Link} href="/dashboard/settings" variant="primary">
                  Go to settings
                </Button>
                <Button as={Link} href="/dashboard" variant="ghost">
                  Go to dashboard
                </Button>
              </div>
            </>
          )}

          {!loading && !error && result?.status === 'failed' && (
            <>
              <p className="text-sm text-red-600">{result.message || 'Payment was not successful.'}</p>
              <div className="flex gap-2">
                <Button as={Link} href="/pricing" variant="primary">
                  Try again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentCallbackFallback() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Payment Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">Loading payment reference...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentCallbackFallback />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
