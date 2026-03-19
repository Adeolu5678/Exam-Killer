import { NextRequest, NextResponse } from 'next/server';

import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import { withAuth } from '@/shared/lib/api/auth';
import { getUserNotebookByNlmId, createJob } from '@/shared/lib/notebooklm/user-notebooks';

const JobRequestSchema = z.object({
  workspaceId: z.string(),
  jobType: z.enum(['audio', 'video', 'infographic']),
});

/**
 * POST /api/notebooklm/notebooks/[notebookId]/jobs
 * Submits a new long-running generation job.
 */
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { pathname } = new URL(req.url);
    const pathParts = pathname.split('/');
    const notebookId = pathParts[4]; // /api/notebooklm/notebooks/[notebookId]/jobs

    if (!notebookId) {
      return NextResponse.json({ error: 'Notebook ID required' }, { status: 400 });
    }

    const body = await req.json();

    // 1. Validate body
    const result = JobRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 },
      );
    }
    const { workspaceId, jobType } = result.data;

    // 2. Verify ownership and get profile_name
    const userNotebook = await getUserNotebookByNlmId(notebookId);
    if (!userNotebook || userNotebook.app_user_id !== user.uid) {
      return NextResponse.json({ error: 'Notebook not found or access denied' }, { status: 404 });
    }

    // 3. Check for existing identical pending/processing job
    const db = getFirestore();
    const existingJobs = await db
      .collection('nlm_jobs')
      .where('workspace_id', '==', workspaceId)
      .where('job_type', '==', jobType)
      .where('status', 'in', ['pending', 'processing'])
      .limit(1)
      .get();

    if (!existingJobs.empty) {
      const existingJob = existingJobs.docs[0].data();
      return NextResponse.json(
        {
          error: 'Job already in progress',
          job_id: existingJob.job_id,
        },
        { status: 409 },
      );
    }

    // 4. Create new job
    const jobId = await createJob({
      app_user_id: user.uid,
      workspace_id: workspaceId,
      notebook_id: notebookId,
      profile_name: userNotebook.profile_name,
      job_type: jobType,
      status: 'pending',
      result_url: null,
      error_message: null,
    });

    return NextResponse.json({ job_id: jobId }, { status: 202 });
  } catch (error: unknown) {
    console.error('[NLM_JOBS_POST] Error:', error);
    return NextResponse.json({ error: 'Failed to submit job' }, { status: 500 });
  }
});
