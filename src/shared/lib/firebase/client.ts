import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

import { getFirebaseConfig } from './config';

const firebaseConfig = getFirebaseConfig();

export const isFirebaseConfigured = firebaseConfig !== null;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured && firebaseConfig) {
  app = initializeApp(firebaseConfig as FirebaseOptions);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getFirestore(app);
}

export { app, auth, googleProvider, db };
