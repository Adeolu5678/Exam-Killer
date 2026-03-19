const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase environment variables');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function forceSeed() {
  const account = {
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
  };

  await db.collection('notebooklm_accounts').doc(account.profile_name).set(account);
  console.log('Force seeded nlm_01');
}

forceSeed().catch(console.error);
