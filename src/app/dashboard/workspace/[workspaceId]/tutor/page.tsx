import { redirect } from 'next/navigation';

interface WorkspaceTutorAliasPageProps {
  params: { workspaceId: string };
}

export default function WorkspaceTutorAliasPage({ params }: WorkspaceTutorAliasPageProps) {
  redirect(`/dashboard/workspace/${params.workspaceId}/chat`);
}
