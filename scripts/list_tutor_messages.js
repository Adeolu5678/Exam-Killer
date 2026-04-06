const admin = require('firebase-admin');
const path = require('path');

const keyPath = path.resolve(__dirname, '..', 'examkiller-firebase-adminsdk-fbsvc-bd6455f77a.json');
try {
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  console.error('Failed to initialize Firebase admin:', e.message || e);
  process.exit(1);
}

const db = admin.firestore();

(async () => {
  try {
    const snapshot = await db
      .collection('tutor_messages')
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();
    if (snapshot.empty) {
      console.log('NO_MESSAGES');
      return;
    }
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(JSON.stringify(docs, null, 2));
  } catch (e) {
    console.error('Error querying tutor_messages:', e.message || e);
    process.exit(1);
  }
})();
