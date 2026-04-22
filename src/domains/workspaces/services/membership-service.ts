import { Firestore, Timestamp } from 'firebase-admin/firestore';


import { getAdminDb } from '@/shared/lib/firebase/admin';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import { verifyWorkspaceAccess } from './workspace-service';
import type { WorkspaceRole } from '../contracts/workspace';

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

// -----------------------------------------------------------------------------
// Member types
// -----------------------------------------------------------------------------

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  email: string;
  full_name: string;
  joined_at: string;
}

// -----------------------------------------------------------------------------
// Membership operations
// -----------------------------------------------------------------------------

export async function listWorkspaceMembers(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember[]> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this workspace');
  }

  const db = getDb();

  // Get all members
  const membersSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .get();

  const memberUserIds = membersSnapshot.docs.map((doc) => doc.data().user_id as string);
  
  // Include owner
  const ownerId = access.workspaceData?.owner_user_id || access.workspaceData?.user_id;
  if (ownerId && !memberUserIds.includes(ownerId)) {
    memberUserIds.unshift(ownerId);
  }

  // Fetch user details
  const userDocs = await Promise.all(
    memberUserIds.map((uid) => db.collection('users').doc(uid).get()),
  );

  const userMap = new Map<string, { email: string; full_name: string }>();
  userDocs.forEach((doc) => {
    if (doc.exists) {
      const data = doc.data();
      userMap.set(doc.id, {
        email: data?.email || '',
        full_name: data?.full_name || '',
      });
    }
  });

  // Build member list
  const members: WorkspaceMember[] = [];

  // Add owner first
  if (ownerId) {
    const ownerInfo = userMap.get(ownerId);
    members.push({
      id: ownerId + '_owner',
      workspace_id: workspaceId,
      user_id: ownerId,
      role: 'owner',
      email: ownerInfo?.email || '',
      full_name: ownerInfo?.full_name || '',
      joined_at: access.workspaceData?.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  }

  // Add other members
  membersSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const uid = data.user_id as string;
    if (uid === ownerId) return; // Skip owner, already added

    const userInfo = userMap.get(uid);
    members.push({
      id: doc.id,
      workspace_id: workspaceId,
      user_id: uid,
      role: (data.role as WorkspaceRole) || 'member',
      email: userInfo?.email || '',
      full_name: userInfo?.full_name || '',
      joined_at: data.joined_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  });

  return members;
}

export async function addWorkspaceMember(
  workspaceId: string,
  inviterId: string,
  targetUserId: string,
  role: 'admin' | 'member' = 'member',
): Promise<WorkspaceMember> {
  const access = await verifyWorkspaceAccess(workspaceId, inviterId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  // Only owner or admin can add members
  if (!access.isOwner && access.role !== 'admin') {
    throw new AuthorizationError('Only workspace owner or admins can add members');
  }

  const db = getDb();

  // Verify target user exists
  const targetUserDoc = await db.collection('users').doc(targetUserId).get();
  if (!targetUserDoc.exists) {
    throw new ValidationError('User not found');
  }

  // Check if already a member
  const existingMember = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', targetUserId)
    .limit(1)
    .get();

  if (!existingMember.empty) {
    throw new ValidationError('User is already a member of this workspace');
  }

  // Check if target is owner
  const ownerId = access.workspaceData?.owner_user_id || access.workspaceData?.user_id;
  if (targetUserId === ownerId) {
    throw new ValidationError('Cannot add workspace owner as a member');
  }

  const memberId = workspaceId + '_' + targetUserId;
  const now = Timestamp.now();

  const memberData = {
    workspace_id: workspaceId,
    user_id: targetUserId,
    role,
    invited_by: inviterId,
    joined_at: now,
  };

  await db.collection('workspace_members').doc(memberId).set(memberData);

  const targetUserData = targetUserDoc.data();

  appLogger.info('Member added to workspace', { workspaceId, targetUserId, role, inviterId });

  return {
    id: memberId,
    workspace_id: workspaceId,
    user_id: targetUserId,
    role,
    email: targetUserData?.email || '',
    full_name: targetUserData?.full_name || '',
    joined_at: now.toDate().toISOString(),
  };
}

export async function updateMemberRole(
  workspaceId: string,
  actorUserId: string,
  targetUserId: string,
  newRole: 'admin' | 'member',
): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, actorUserId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  // Only owner can change roles
  if (!access.isOwner) {
    throw new AuthorizationError('Only workspace owner can change member roles');
  }

  // Cannot change owner role
  const ownerId = access.workspaceData?.owner_user_id || access.workspaceData?.user_id;
  if (targetUserId === ownerId) {
    throw new ValidationError('Cannot change workspace owner role');
  }

  const db = getDb();
  const memberId = workspaceId + '_' + targetUserId;

  const memberDoc = await db.collection('workspace_members').doc(memberId).get();
  if (!memberDoc.exists) {
    throw new ValidationError('Member not found');
  }

  await db.collection('workspace_members').doc(memberId).update({ role: newRole });

  appLogger.info('Member role updated', { workspaceId, targetUserId, newRole });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  actorUserId: string,
  targetUserId: string,
): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, actorUserId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  // Owner cannot be removed
  const ownerId = access.workspaceData?.owner_user_id || access.workspaceData?.user_id;
  if (targetUserId === ownerId) {
    throw new ValidationError('Cannot remove workspace owner');
  }

  // User can remove themselves, or owner/admin can remove others
  const isSelf = actorUserId === targetUserId;
  const canRemoveOthers = access.isOwner || access.role === 'admin';

  if (!isSelf && !canRemoveOthers) {
    throw new AuthorizationError('You do not have permission to remove this member');
  }

  const db = getDb();
  const memberId = workspaceId + '_' + targetUserId;

  const memberDoc = await db.collection('workspace_members').doc(memberId).get();
  if (!memberDoc.exists) {
    throw new ValidationError('Member not found');
  }

  await db.collection('workspace_members').doc(memberId).delete();

  appLogger.info('Member removed from workspace', { workspaceId, targetUserId, removedBy: actorUserId });
}

export async function joinPublicWorkspace(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  if (!access.workspaceData?.is_public) {
    throw new AuthorizationError('This workspace is not public');
  }

  // Already has access
  if (access.hasAccess && access.role) {
    throw new ValidationError('You are already a member of this workspace');
  }

  const db = getDb();

  // Get user info
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new ValidationError('User not found');
  }

  const memberId = workspaceId + '_' + userId;
  const now = Timestamp.now();

  const memberData = {
    workspace_id: workspaceId,
    user_id: userId,
    role: 'member' as const,
    invited_by: userId, // Self-join
    joined_at: now,
  };

  await db.collection('workspace_members').doc(memberId).set(memberData);

  const userData = userDoc.data();

  appLogger.info('User joined public workspace', { workspaceId, userId });

  return {
    id: memberId,
    workspace_id: workspaceId,
    user_id: userId,
    role: 'member',
    email: userData?.email || '',
    full_name: userData?.full_name || '',
    joined_at: now.toDate().toISOString(),
  };
}
