import { redirect } from 'next/navigation';

interface WorkspacePageProps {
  params: { workspaceId: string };
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  redirect(`/dashboard/workspace/${params.workspaceId}/sources`);
}
