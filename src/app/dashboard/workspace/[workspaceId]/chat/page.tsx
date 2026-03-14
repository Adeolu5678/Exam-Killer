// =============================================================================
// app/dashboard/workspace/[workspaceId]/chat/page.tsx
// Layer: app (thin assembly only — no business logic)
// Purpose: FSD-compliant tutor page. Lazy-loads ChatInterface for performance.
//          Wraps with Suspense so the rest of the workspace shell loads first.
// =============================================================================

import { Suspense } from 'react';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/shared/ui';

import { UploadZone, SourceList } from '@/features/sources';

// Lazy-load the heavy ChatInterface (streaming, framer-motion)
const ChatInterface = dynamic(() => import('@/features/tutor/ui/ChatInterface'), {
  ssr: false,
  loading: () => <ChatInterfaceFallback />,
});

interface TutorPageProps {
  params: { workspaceId: string };
}

export default function TutorPage({ params }: TutorPageProps) {
  const { workspaceId } = params;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Suspense fallback={<ChatInterfaceFallback />}>
        <ChatInterface workspaceId={workspaceId} UploadZone={UploadZone} SourceList={SourceList} />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton fallback shown while ChatInterface loads
// ---------------------------------------------------------------------------

function ChatInterfaceFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '0',
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          height: '72px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Skeleton variant="rect" width={120} height={20} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            width={100}
            height={44}
            style={{ borderRadius: '12px' }}
          />
        ))}
      </div>

      {/* Message area skeleton */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton variant="rect" width="55%" height={72} style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton variant="rect" width="40%" height={52} style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton variant="rect" width="65%" height={96} style={{ borderRadius: '12px' }} />
        </div>
      </div>

      {/* Input bar skeleton */}
      <div
        style={{
          height: '80px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Skeleton variant="rect" width="100%" height={44} style={{ borderRadius: '20px' }} />
        <Skeleton variant="circle" width={40} height={40} />
      </div>
    </div>
  );
}

// Page metadata
export const metadata = {
  title: 'AI Tutor | Exam Killer',
  description: 'Chat with your AI tutor about your study material.',
};
