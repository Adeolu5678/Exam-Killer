// =============================================================================
// app/dashboard/workspace/[workspaceId]/layout.tsx
// Layer: app (thin routing layer only — no business logic)
// Wraps all workspace sub-routes with the WorkspaceShell widget.
// Blueprint §2.1: "This means the Next.js page at /workspace/[id]/* only
//                  assembles composition, never contains logic."
// =============================================================================

import React from 'react';

import { WorkspaceShell } from '@/widgets/WorkspaceShell';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: { workspaceId: string };
}

export default function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  return <WorkspaceShell workspaceId={params.workspaceId}>{children}</WorkspaceShell>;
}
