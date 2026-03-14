// =============================================================================
// widgets/CommandPalette/useCommandPaletteCommands.ts
// Layer: widgets → CommandPalette
// Provides static command groups for the global ⌘K palette.
// FSD Rule: imports only from shared/ui and features/workspace public APIs.
// =============================================================================

import { useRouter } from 'next/navigation';

import { LayoutDashboard, Settings, BookOpen, Plus, Bot, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Re-exported workspace list from the workspace feature public API
import { type WorkspaceListItem } from '@/features/workspace';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Called when the item is selected */
  onSelect: () => void;
}

export interface CommandGroup {
  heading: string;
  commands: PaletteCommand[];
}

// ---------------------------------------------------------------------------
// Hook — assembles all command groups; workspaces injected by consumer
// ---------------------------------------------------------------------------

interface UseCommandPaletteCommandsArgs {
  /** Recent workspaces to list (from TanStack Query cache via consumer) */
  workspaces?: WorkspaceListItem[];
  onClose: () => void;
  onCreateWorkspace: () => void;
}

export function useCommandPaletteCommands({
  workspaces = [],
  onClose,
  onCreateWorkspace,
}: UseCommandPaletteCommandsArgs): CommandGroup[] {
  const router = useRouter();

  function go(href: string) {
    router.push(href);
    onClose();
  }

  // ── Group 1: Navigation ─────────────────────────────────────────────────
  const navigationGroup: CommandGroup = {
    heading: 'Navigation',
    commands: [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'Return to the main dashboard',
        icon: LayoutDashboard,
        onSelect: () => go('/dashboard'),
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        description: 'Manage your account and preferences',
        icon: Settings,
        onSelect: () => go('/dashboard/settings'),
      },
    ],
  };

  // ── Group 2: Recent Workspaces ──────────────────────────────────────────
  const workspaceGroup: CommandGroup = {
    heading: 'Workspaces',
    commands: workspaces.slice(0, 5).map((ws) => ({
      id: `ws-${ws.id}`,
      label: ws.name,
      description: ws.course_code ?? ws.description ?? 'Open workspace',
      icon: BookOpen,
      onSelect: () => go(`/dashboard/workspace/${ws.id}`),
    })),
  };

  // ── Group 3: Quick Actions ──────────────────────────────────────────────
  const quickActionsGroup: CommandGroup = {
    heading: 'Quick Actions',
    commands: [
      {
        id: 'action-create-workspace',
        label: 'Create Workspace',
        description: 'Start a new study workspace',
        icon: Plus,
        onSelect: () => {
          onCreateWorkspace();
          onClose();
        },
      },
      {
        id: 'action-open-tutor',
        label: 'Open AI Tutor',
        description: 'Start a chat session in the current workspace',
        icon: Bot,
        onSelect: () => {
          // Navigate to the first workspace's tutor if available
          if (workspaces[0]) {
            go(`/dashboard/workspace/${workspaces[0].id}/chat`);
          } else {
            go('/dashboard');
          }
        },
      },
      {
        id: 'action-invite',
        label: 'Invite Members',
        description: 'Collaborate with classmates',
        icon: Users,
        onSelect: () => go('/dashboard/settings'),
      },
    ],
  };

  // Only include workspace group if there are items
  const groups: CommandGroup[] = [navigationGroup];
  if (workspaceGroup.commands.length > 0) groups.push(workspaceGroup);
  groups.push(quickActionsGroup);

  return groups;
}
