'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@/shared/ui';

import {
  fetchWorkspaceMembers,
  inviteMember,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  useWorkspace,
} from '@/features/workspace';

interface MembersPageProps {
  params: { workspaceId: string };
}

type MemberRole = 'owner' | 'admin' | 'member';

interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: MemberRole;
  joined_at: string;
}

export default function WorkspaceMembersPage({ params }: MembersPageProps) {
  const { workspaceId } = params;
  const { data: workspaceResponse, isPending: isLoadingWorkspace } = useWorkspace(workspaceId);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [actioningMemberId, setActioningMemberId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const workspace = workspaceResponse?.workspace;
  const currentUserRole = workspace?.user_role ?? null;
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canChangeRoles = currentUserRole === 'owner';
  const canRemoveMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setError(null);

    try {
      const response = await fetchWorkspaceMembers(workspaceId);
      setMembers(response.members as WorkspaceMember[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load members');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const ownerEmail = workspace?.owner.email ?? '';
  const normalizedMembers = useMemo(
    () =>
      members.map((member) =>
        member.role === 'owner' && !member.email ? { ...member, email: ownerEmail } : member,
      ),
    [members, ownerEmail],
  );

  const handleInvite = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!inviteEmail.trim()) {
      setError('Enter an email address to invite a member.');
      return;
    }

    setIsInviting(true);

    try {
      await inviteMember(workspaceId, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setInviteRole('member');
      setSuccessMessage('Member added successfully.');
      await loadMembers();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to add member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'member') => {
    setActioningMemberId(memberId);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateWorkspaceMemberRole(workspaceId, memberId, role);
      setSuccessMessage('Member role updated.');
      await loadMembers();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Failed to update role');
    } finally {
      setActioningMemberId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setActioningMemberId(memberId);
    setError(null);
    setSuccessMessage(null);

    try {
      await removeWorkspaceMember(workspaceId, memberId);
      setSuccessMessage('Member removed from workspace.');
      await loadMembers();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove member');
    } finally {
      setActioningMemberId(null);
    }
  };

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Members
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage who can study inside this workspace and what role each collaborator has.
        </p>
      </header>

      {error && <Badge variant="error">{error}</Badge>}
      {successMessage && <Badge variant="success">{successMessage}</Badge>}

      <Card>
        <CardHeader>
          <CardTitle>Collaboration access</CardTitle>
          <CardDescription>
            {canInvite
              ? 'Invite teammates by email and assign member or admin access.'
              : 'Only workspace owners and admins can invite new members.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Input
              id="workspace-member-email"
              label="Member email"
              type="email"
              placeholder="study-partner@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              disabled={!canInvite || isInviting}
            />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1.5">
            <label
              htmlFor="workspace-member-role"
              className="text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Role
            </label>
            <select
              id="workspace-member-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
              disabled={!canInvite || isInviting}
              className="min-h-[42px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--color-text-primary)]"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button onClick={handleInvite} loading={isInviting} disabled={!canInvite}>
            Add member
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace team</CardTitle>
          <CardDescription>
            Owners can change roles. Admins can remove members but cannot promote or demote others.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoadingWorkspace || isLoadingMembers ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : normalizedMembers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No members found.</p>
          ) : (
            normalizedMembers.map((member) => {
              const isOwnerRow = member.role === 'owner';
              const canRemoveThisMember =
                canRemoveMembers &&
                !isOwnerRow &&
                !(currentUserRole === 'admin' && member.role === 'admin');

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[var(--color-text-primary)]">
                        {member.name}
                      </p>
                      <Badge
                        variant={
                          member.role === 'owner'
                            ? 'warning'
                            : member.role === 'admin'
                              ? 'primary'
                              : 'outline'
                        }
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-[var(--color-text-secondary)]">
                      {member.email || 'No email available'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-[220px] md:items-end">
                    {canChangeRoles && !isOwnerRow ? (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(member.id, event.target.value as 'admin' | 'member')
                        }
                        disabled={actioningMemberId === member.id}
                        className="min-h-[38px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 text-sm text-[var(--color-text-primary)]"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {isOwnerRow ? 'Workspace owner' : 'Role changes require owner access'}
                      </span>
                    )}

                    {canRemoveThisMember ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemove(member.id)}
                        disabled={actioningMemberId === member.id}
                      >
                        {actioningMemberId === member.id ? 'Working...' : 'Remove member'}
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {isOwnerRow ? 'Owner cannot be removed' : 'You cannot remove this member'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
