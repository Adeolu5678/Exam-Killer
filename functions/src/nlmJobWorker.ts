import { Timestamp, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentCreated, FirestoreEvent } from 'firebase-functions/v2/firestore';

import { NlmMcpClient } from './notebooklm-client';
import { NlmJob } from './notebooklm-types';

export const nlmJobWorker = onDocumentCreated(
  'nlm_jobs/{jobId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { jobId: string }>) => {
    const jobRef = event.data?.ref;
    if (!jobRef) return;

    const job = event.data?.data() as NlmJob;

    if (!job || job.status !== 'pending') return;

    // Mark as processing
    await jobRef.update({ status: 'processing' });

    const client = new NlmMcpClient();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const rawResult = await client.generate(job.profile_name, job.notebook_id, job.job_type);

        // rawResult is a local file path or binary blob from the CLI
        // Upload to Firebase Storage
        const bucket = getStorage().bucket();
        const extension = getExtension(job.job_type);
        const { jobId } = event.params;
        const destPath = `nlm-outputs/${job.app_user_id}/${jobId}.${extension}`;

        await bucket.upload(rawResult, { destination: destPath, public: false });

        // Get signed URL for the student to view it
        const [url] = await bucket.file(destPath).getSignedUrl({
          action: 'read',
          expires: '2099-01-01',
        });

        await jobRef.update({
          status: 'done',
          result_url: url,
          completed_at: Timestamp.now(),
          retry_count: attempt,
        });
        return; // success — exit
      } catch (e: unknown) {
        console.error(`[NLM_WORKER] Attempt ${attempt} failed:`, e);
        if (attempt === maxRetries) {
          await jobRef.update({
            status: 'error',
            error_message: e instanceof Error ? e.message : 'Unknown error',
            completed_at: Timestamp.now(),
          });
        }
        // else loop and retry
      }
    }
  },
);

function getExtension(jobType: string) {
  const extensions: Record<string, string> = {
    audio: 'mp3',
    video: 'mp4',
    infographic: 'png',
  };
  return extensions[jobType] ?? 'bin';
}
