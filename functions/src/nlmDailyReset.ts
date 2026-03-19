import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Runs at 00:01 UTC every day
export const nlmDailyReset = onSchedule('1 0 * * *', async () => {
  const db = getFirestore();
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
