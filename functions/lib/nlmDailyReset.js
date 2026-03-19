'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.nlmDailyReset = void 0;
const firestore_1 = require('firebase-admin/firestore');
const scheduler_1 = require('firebase-functions/v2/scheduler');
// Runs at 00:01 UTC every day
exports.nlmDailyReset = (0, scheduler_1.onSchedule)('1 0 * * *', async () => {
  const db = (0, firestore_1.getFirestore)();
  const snapshot = await db.collection('notebooklm_accounts').get();
  const batch = db.batch();
  const today = new Date().toISOString().split('T')[0];
  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      daily_queries_used: 0,
      daily_audio_used: 0,
      daily_video_used: 0,
      is_active: true,
      last_reset_date: today,
    });
  });
  await batch.commit();
});
//# sourceMappingURL=nlmDailyReset.js.map
