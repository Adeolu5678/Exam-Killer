import dynamic from 'next/dynamic';

import { StudioSkeleton } from '@/features/studio';

const StudioPageShell = dynamic(() => import('@/features/studio').then((m) => m.StudioPageShell), {
  ssr: false,
  loading: () => <StudioSkeleton />,
});

export default function StudioPage({ params }: { params: { workspaceId: string } }) {
  return <StudioPageShell workspaceId={params.workspaceId} />;
}
