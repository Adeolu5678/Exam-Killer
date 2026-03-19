import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

interface FirebaseAdminApp {
  app: App;
  auth: Auth;
  db: Firestore;
  storage: Storage;
  Timestamp: typeof Timestamp;
}

let adminApp: FirebaseAdminApp | null = null;
let initializationError: Error | null = null;

function getServiceAccount(): ServiceAccount | null {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      return JSON.parse(serviceAccountKey) as ServiceAccount;
    } catch (error) {
      initializationError = new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable',
      );
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

function initializeFirebaseAdmin(): FirebaseAdminApp | null {
  if (adminApp) {
    return adminApp;
  }

  if (initializationError) {
    return null;
  }

  if (getApps().length > 0) {
    const existingApp = getApps()[0];
    adminApp = {
      app: existingApp,
      auth: getAuth(existingApp),
      db: getFirestore(existingApp),
      storage: getStorage(existingApp),
      Timestamp,
    };
    return adminApp;
  }

  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    adminApp = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      Timestamp,
    };

    return adminApp;
  } catch (error) {
    initializationError =
      error instanceof Error ? error : new Error('Failed to initialize Firebase Admin');
    return null;
  }
}

export function getAdminApp(): FirebaseAdminApp | null {
  return initializeFirebaseAdmin();
}

export function getAdminAuth(): Auth | null {
  const app = initializeFirebaseAdmin();
  return app?.auth ?? null;
}

export function getAdminDb(): Firestore | null {
  const app = initializeFirebaseAdmin();
  return app?.db ?? null;
}

export function getAdminStorage() {
  const app = initializeFirebaseAdmin();
  return app?.storage ?? null;
}

export function getStorageBucket(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null;
}

const app = requireAdminApp();
const adminDb = {
  db: app.db,
  Timestamp: Timestamp,
};

export { adminDb };

export function requireAdminApp(): FirebaseAdminApp {
  const app = initializeFirebaseAdmin();
  if (!app) {
    if (initializationError) {
      throw initializationError;
    }
    throw new Error(
      'Firebase Admin not initialized. Provide either FIREBASE_SERVICE_ACCOUNT_KEY or ' +
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables. ' +
        'Check that FIREBASE_PROJECT_ID=' +
        process.env.FIREBASE_PROJECT_ID +
        ' and has value.',
    );
  }
  return app;
}

export { initializeFirebaseAdmin };
export type { FirebaseAdminApp };
