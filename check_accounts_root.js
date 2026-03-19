const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

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

async function checkAccounts() {
  const snapshot = await db.collection('notebooklm_accounts').get();
  if (snapshot.empty) {
    console.log('No accounts found in notebooklm_accounts collection');
    return;
  }

  console.log('Accounts found:');
  snapshot.docs.forEach((doc) => {
    console.log(`- ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
  });
}

checkAccounts().catch(console.error);
