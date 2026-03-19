import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { NlmAccount } from './types';
import { getAdminDb } from '../firebase/admin';

const ACCOUNTS: NlmAccount[] = [
  {
    profile_name: 'nlm_01',
    email: 'account01@gmail.com',
    is_active: true,
    daily_queries_used: 0,
    daily_audio_used: 0,
    daily_video_used: 0,
    daily_quota_queries: 480,
    daily_quota_audio: 18,
    daily_quota_video: 8,
    last_reset_date: new Date().toISOString().split('T')[0],
  },
  {
    profile_name: 'nlm_02',
    email: 'account02@gmail.com',
    is_active: true,
    daily_queries_used: 0,
    daily_audio_used: 0,
    daily_video_used: 0,
    daily_quota_queries: 480,
    daily_quota_audio: 18,
    daily_quota_video: 8,
    last_reset_date: new Date().toISOString().split('T')[0],
  },
  {
    profile_name: 'nlm_03',
    email: 'account03@gmail.com',
    is_active: true,
    daily_queries_used: 0,
    daily_audio_used: 0,
    daily_video_used: 0,
    daily_quota_queries: 480,
    daily_quota_audio: 18,
    daily_quota_video: 8,
    last_reset_date: new Date().toISOString().split('T')[0],
  },
];

async function seed() {
  const db = getAdminDb();
  if (!db) {
    console.error('Failed to get Firestore Admin DB instance');
    process.exit(1);
  }

  console.log('Seeding NotebookLM accounts...');

  for (const account of ACCOUNTS) {
    await db.collection('notebooklm_accounts').doc(account.profile_name).set(account);
    console.log(`- Seeded ${account.profile_name}`);
  }

  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
