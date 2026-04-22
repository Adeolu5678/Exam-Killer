"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSourceProcessingJobCreated = void 0;
const app_1 = require("firebase-admin/app");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-functions/v2/firestore");
(0, app_1.initializeApp)();
const SOURCE_JOBS_COLLECTION_PATH = 'source_processing_jobs/{jobId}';
exports.onSourceProcessingJobCreated = (0, firestore_1.onDocumentCreated)({
    document: SOURCE_JOBS_COLLECTION_PATH,
    region: 'us-central1',
    retry: true,
}, async (event) => {
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
        firebase_functions_1.logger.error('Source job worker request failed', {
            jobId,
            status: response.status,
            body,
        });
        throw new Error(`Source job worker failed with status ${response.status}`);
    }
    firebase_functions_1.logger.info('Source job worker succeeded', { jobId });
});
//# sourceMappingURL=index.js.map