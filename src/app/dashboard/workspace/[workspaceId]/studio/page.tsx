import { redirect } from 'next/navigation';

interface WorkspaceStudioPageProps {
  params: { workspaceId: string };
}

export default function WorkspaceStudioPage({ params }: WorkspaceStudioPageProps) {
  redirect(`/dashboard/workspace/${params.workspaceId}/sources`);
}
