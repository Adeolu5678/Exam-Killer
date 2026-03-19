import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/shared/lib/api/auth';
import { getJob } from '@/shared/lib/notebooklm/user-notebooks';

/**
 * GET /api/notebooklm/jobs/[jobId]
 * Returns the status of a long-running generation job.
 */
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { pathname } = new URL(req.url);
    const pathParts = pathname.split('/');
    const jobId = pathParts[4]; // /api/notebooklm/jobs/[jobId]

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify ownership
    if (job.app_user_id !== user.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Omit internal profile_name and return formatted timestamps
    const { profile_name, ...responseJob } = job;

    return NextResponse.json(
      {
        ...responseJob,
        created_at: job.created_at?.toDate?.()?.toISOString() || job.created_at,
        completed_at: job.completed_at?.toDate?.()?.toISOString() || job.completed_at,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error('[NLM_JOB_GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 });
  }
});
