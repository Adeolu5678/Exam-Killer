import { NlmMcpClient } from './client';
import { selectProfile, incrementUsage } from './router';
import { createUserNotebook } from './user-notebooks';

/**
 * High-level service for NotebookLM operations.
 */
export const NlmService = {
  /**
   * Initializes a new NotebookLM notebook for a workspace.
   * Handles profile selection, NLM creation, and Firestore mapping.
   */
  async initializeNotebook(userId: string, workspaceId: string, title: string) {
    // 1. Select a pool account
    let profileName: string;
    try {
      profileName = await selectProfile('query');
    } catch (err: any) {
      if (err.message === 'NLM_QUOTA_EXHAUSTED') {
        throw new Error('NLM_QUOTA_EXHAUSTED');
      }
      throw err;
    }

    // 2. Create notebook in NLM
    const nlmClient = new NlmMcpClient();
    let notebookId: string;
    try {
      notebookId = await nlmClient.createNotebook(profileName, title);
    } catch (err: any) {
      console.error('[NlmService] NLM Creation Error:', err);
      throw new Error('FAILED_TO_CREATE_NLM_NOTEBOOK');
    }

    // 3. Update usage
    await incrementUsage(profileName, 'query');

    // 4. Store in Firestore
    await createUserNotebook({
      app_user_id: userId,
      workspace_id: workspaceId,
      notebook_id: notebookId,
      profile_name: profileName,
      title: title,
    });

    return { notebookId, profileName };
  },
};
