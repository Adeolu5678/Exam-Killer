'use client';

import { useEffect, useState } from 'react';

import { AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@/shared/ui';

type LaunchChecklistStatus = 'pass' | 'manual' | 'fail';

interface LaunchChecklistItem {
  id: string;
  label: string;
  status: LaunchChecklistStatus;
  blocked: boolean;
  detail: string;
}

interface LaunchReadinessData {
  ok: boolean;
  generated_at: string;
  health_ready: boolean;
  checklist: LaunchChecklistItem[];
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

function statusBadgeVariant(status: LaunchChecklistStatus): 'success' | 'outline' | 'error' {
  if (status === 'pass') return 'success';
  if (status === 'manual') return 'outline';
  return 'error';
}

export default function AdminOperationsPage() {
  const [data, setData] = useState<LaunchReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/launch-readiness');
      const payload = (await response.json()) as ApiEnvelope<LaunchReadinessData>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? 'Failed to load launch readiness report.' : payload.error?.message);
      }

      setData(payload.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load launch readiness report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReadiness();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Launch Readiness</h1>
          <p className="text-gray-500">Operational checklist for Phase 7 hardening and release gating.</p>
        </div>
        <Button onClick={fetchReadiness} variant="ghost">
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {data?.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
                {data?.ok ? 'Launch-safe' : 'Not yet launch-safe'}
              </CardTitle>
              <CardDescription>
                Generated {data ? new Date(data.generated_at).toLocaleString() : '—'} · Health readiness:{' '}
                {data?.health_ready ? 'ready' : 'degraded'}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {data?.checklist.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'manual' && <CircleDot className="h-4 w-4 text-gray-400" />}
                    <Badge variant={statusBadgeVariant(item.status)}>
                      {item.status === 'manual' ? 'manual' : item.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
