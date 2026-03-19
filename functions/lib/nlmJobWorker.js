'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.nlmJobWorker = void 0;
const firestore_1 = require('firebase-admin/firestore');
const storage_1 = require('firebase-admin/storage');
const firestore_2 = require('firebase-functions/v2/firestore');
const notebooklm_client_1 = require('./notebooklm-client');
exports.nlmJobWorker = (0, firestore_2.onDocumentCreated)('nlm_jobs/{jobId}', async (event) => {
  var _a, _b;
  const jobRef = (_a = event.data) === null || _a === void 0 ? void 0 : _a.ref;
  if (!jobRef) return;
  const job = (_b = event.data) === null || _b === void 0 ? void 0 : _b.data();
  if (!job || job.status !== 'pending') return;
  // Mark as processing
  await jobRef.update({ status: 'processing' });
  const client = new notebooklm_client_1.NlmMcpClient();
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const rawResult = await client.generate(job.profile_name, job.notebook_id, job.job_type);
      // rawResult is a local file path or binary blob from the CLI
      // Upload to Firebase Storage
      const bucket = (0, storage_1.getStorage)().bucket();
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
        completed_at: firestore_1.Timestamp.now(),
        retry_count: attempt,
      });
      return; // success — exit
    } catch (e) {
      console.error(`[NLM_WORKER] Attempt ${attempt} failed:`, e);
      if (attempt === maxRetries) {
        await jobRef.update({
          status: 'error',
          error_message: e instanceof Error ? e.message : 'Unknown error',
          completed_at: firestore_1.Timestamp.now(),
        });
      }
      // else loop and retry
    }
  }
});
function getExtension(jobType) {
  var _a;
  const extensions = {
    audio: 'mp3',
    video: 'mp4',
    infographic: 'png',
  };
  return (_a = extensions[jobType]) !== null && _a !== void 0 ? _a : 'bin';
}
//# sourceMappingURL=nlmJobWorker.js.map
