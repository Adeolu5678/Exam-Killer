const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
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

async function check() {
  const workspaceId = 'vb8bvcBusy52SoFw3iNJ';
  const doc = await db.collection('workspaces').doc(workspaceId).get();
  if (doc.exists) {
    console.log('Workspace exists:', JSON.stringify(doc.data(), null, 2));
  } else {
    console.log('Workspace NOT FOUND in workspaces collection');
    // Try listing all workspaces to see what we have
    const snapshot = await db.collection('workspaces').limit(5).get();
    console.log(
      'Sample workspaces:',
      snapshot.docs.map((d) => d.id),
    );
  }
}

check().catch(console.error);
