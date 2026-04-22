import { getAdminAuth, getAdminDb, getStorageBucket } from '../firebase/admin';

export interface HealthDependencyStatus {
  name: string;
  healthy: boolean;
  detail: string;
}

export interface HealthReport {
  ok: boolean;
  service: 'exam-killer';
  timestamp: string;
  checks: HealthDependencyStatus[];
}

export function createHealthReport(checks: HealthDependencyStatus[]): HealthReport {
  return {
    ok: checks.every((check) => check.healthy),
    service: 'exam-killer',
    timestamp: new Date().toISOString(),
    checks,
  };
}

export function getLivenessChecks(): HealthDependencyStatus[] {
  return [
    {
      name: 'runtime',
      healthy: true,
      detail: 'Next.js application process is responding',
    },
  ];
}

export function getFoundationReadinessChecks(): HealthDependencyStatus[] {
  const firebaseClientConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  );
  const firebaseAdminConfigured = Boolean(getAdminAuth() && getAdminDb());
  const storageConfigured = Boolean(getStorageBucket());

  return [
    {
      name: 'firebase-client-config',
      healthy: firebaseClientConfigured,
      detail: firebaseClientConfigured
        ? 'Firebase client configuration is available'
        : 'Missing one or more NEXT_PUBLIC_FIREBASE_* variables required for auth',
    },
    {
      name: 'firebase-admin',
      healthy: firebaseAdminConfigured,
      detail: firebaseAdminConfigured
        ? 'Firebase Admin SDK is initialized'
        : 'Firebase Admin SDK is not initialized',
    },
    {
      name: 'firebase-storage-bucket',
      healthy: storageConfigured,
      detail: storageConfigured
        ? 'Firebase storage bucket is configured'
        : 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing',
    },
  ];
}
