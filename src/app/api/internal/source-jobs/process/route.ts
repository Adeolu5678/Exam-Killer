import { z } from 'zod';

import {
  MAX_SOURCE_PROCESSING_JOB_RETRIES,
  claimSourceProcessingJob,
  completeSourceProcessingJob,
  failSourceProcessingJob,
  requeueSourceProcessingJob,
  processSource,
} from '@/domains/sources';

import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

const ProcessJobRequestSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const expectedSecret = process.env.SOURCE_JOB_WORKER_SECRET;
    if (!expectedSecret) {
      throw new ConfigurationError('SOURCE_JOB_WORKER_SECRET is not configured');
    }

    const providedSecret = request.headers.get('x-source-job-secret');
    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new AuthorizationError('Invalid source job worker secret');
    }

    const body = await request.json();
    const parsed = ProcessJobRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid source job payload');
    }

    const claimedJob = await claimSourceProcessingJob(parsed.data.jobId);
    if (!claimedJob) {
      return apiSuccess({ status: 'skipped', reason: 'job-not-queued' });
    }

    const result = await processSource({
      sourceId: claimedJob.sourceId,
      userId: claimedJob.userId,
    });

    if (result.success) {
      await completeSourceProcessingJob(claimedJob.jobId, result.chunkCount);
      return apiSuccess({
        status: 'completed',
        source_id: claimedJob.sourceId,
        chunk_count: result.chunkCount,
      });
    }

    const errorMessage = result.error || 'Unknown source processing error';
    if (claimedJob.attemptCount < MAX_SOURCE_PROCESSING_JOB_RETRIES) {
      await requeueSourceProcessingJob(claimedJob.jobId, errorMessage);
      return apiError(new Error('Source processing failed and was queued for retry'), {
        status: 500,
      });
    }

    await failSourceProcessingJob(claimedJob.jobId, errorMessage);
    return apiSuccess({
      status: 'failed',
      source_id: claimedJob.sourceId,
      error: errorMessage,
      retries_exhausted: true,
    });
  } catch (error) {
    return apiError(error);
  }
}
