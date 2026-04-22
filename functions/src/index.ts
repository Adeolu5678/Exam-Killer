import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

const SOURCE_JOBS_COLLECTION_PATH = 'source_processing_jobs/{jobId}';

export const onSourceProcessingJobCreated = onDocumentCreated(
  {
    document: SOURCE_JOBS_COLLECTION_PATH,
    region: 'us-central1',
    retry: true,
  },
  async (event) => {
    const workerUrl = process.env.SOURCE_JOB_WORKER_URL;
    const workerSecret = process.env.SOURCE_JOB_WORKER_SECRET;
    const { jobId } = event.params;

    if (!workerUrl || !workerSecret) {
      throw new Error('SOURCE_JOB_WORKER_URL and SOURCE_JOB_WORKER_SECRET must be configured');
    }

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-source-job-secret': workerSecret,
      },
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Source job worker request failed', {
        jobId,
        status: response.status,
        body,
      });
      throw new Error(`Source job worker failed with status ${response.status}`);
    }

    logger.info('Source job worker succeeded', { jobId });
  },
);
