import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';

import type { SubscriptionPlan, UserSubscription, UsageStats } from './subscription';

interface UserDocData {
  subscription_tier?: SubscriptionPlan;
  subscription_status?: 'active' | 'inactive' | 'past_due';
  subscription_start?: Timestamp;
  subscription_end?: Timestamp;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
  paystack_customer_code?: string;
  subscription_id?: string;
  is_trial?: boolean;
  paystack_authorization_code?: string;
  has_had_trial?: boolean;
  matric_number?: string;
  institution?: string;
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  verification_media_url?: string;
  verification_submitted_at?: Timestamp;
  is_admin?: boolean;
}

interface PaymentRecord {
  reference: string;
  user_id: string;
  plan: SubscriptionPlan;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  created_at: Timestamp;
  updated_at: Timestamp;
  payment_method?: string;
  transaction_id?: string;
  metadata?: Record<string, unknown>;
}

interface UsageStatsDoc {
  workspaces_count: number;
  file_uploads_this_month: number;
  ai_queries_today: number;
  flashcards_count: number;
  last_ai_query_date?: string;
  last_month_reset?: string;
}

export async function getUserSubscription(uid: string): Promise<UserSubscription | null> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data() as UserDocData;

    if (!data.subscription_tier) {
      return {
        plan: 'free',
        status: 'inactive',
      };
    }

    return {
      plan: data.subscription_tier,
      status: data.subscription_status || 'inactive',
      currentPeriodStart: data.subscription_start?.toDate(),
      currentPeriodEnd: data.subscription_end?.toDate(),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      isTrial: data.is_trial,
      hasHadTrial: data.has_had_trial,
      paystackAuthorizationCode: data.paystack_authorization_code,
      matricNumber: data.matric_number,
      institution: data.institution,
      verificationStatus: data.verification_status || 'none',
      verificationMediaUrl: data.verification_media_url,
      verificationSubmittedAt: data.verification_submitted_at?.toDate(),
    };
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

export async function updateUserSubscription(
  uid: string,
  data: {
    subscription_tier?: SubscriptionPlan;
    subscription_status?: 'active' | 'inactive' | 'past_due';
    subscription_start?: Date;
    subscription_end?: Date;
    cancel_at_period_end?: boolean;
    subscription_id?: string;
    paystack_customer_code?: string;
    is_trial?: boolean;
    has_had_trial?: boolean;
    paystack_authorization_code?: string;
    matric_number?: string;
    institution?: string;
    verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
    verification_media_url?: string;
    verification_submitted_at?: Date;
  },
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (data.subscription_tier !== undefined) {
      updateData.subscription_tier = data.subscription_tier;
    }
    if (data.subscription_status !== undefined) {
      updateData.subscription_status = data.subscription_status;
    }
    if (data.subscription_start !== undefined) {
      updateData.subscription_start = Timestamp.fromDate(data.subscription_start);
    }
    if (data.subscription_end !== undefined) {
      updateData.subscription_end = Timestamp.fromDate(data.subscription_end);
    }
    if (data.cancel_at_period_end !== undefined) {
      updateData.cancel_at_period_end = data.cancel_at_period_end;
    }
    if (data.subscription_id !== undefined) {
      updateData.subscription_id = data.subscription_id;
    }
    if (data.paystack_customer_code !== undefined) {
      updateData.paystack_customer_code = data.paystack_customer_code;
    }
    if (data.is_trial !== undefined) {
      updateData.is_trial = data.is_trial;
    }
    if (data.has_had_trial !== undefined) {
      updateData.has_had_trial = data.has_had_trial;
    }
    if (data.paystack_authorization_code !== undefined) {
      updateData.paystack_authorization_code = data.paystack_authorization_code;
    }
    if (data.matric_number !== undefined) {
      updateData.matric_number = data.matric_number;
    }
    if (data.institution !== undefined) {
      updateData.institution = data.institution;
    }
    if (data.verification_status !== undefined) {
      updateData.verification_status = data.verification_status;
    }
    if (data.verification_media_url !== undefined) {
      updateData.verification_media_url = data.verification_media_url;
    }
    if (data.verification_submitted_at !== undefined) {
      updateData.verification_submitted_at = Timestamp.fromDate(data.verification_submitted_at);
    }

    await db.collection('users').doc(uid).update(updateData);
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

export async function createPaymentRecord(
  paymentData: Omit<PaymentRecord, 'created_at' | 'updated_at'>,
): Promise<string | null> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }

  try {
    const now = Timestamp.now();
    const paymentRef = db.collection('payments').doc(paymentData.reference);

    await paymentRef.set({
      ...paymentData,
      created_at: now,
      updated_at: now,
    });

    return paymentData.reference;
  } catch (error) {
    console.error('Error creating payment record:', error);
    return null;
  }
}

export async function updatePaymentStatus(
  reference: string,
  status: 'pending' | 'success' | 'failed',
  additionalData?: {
    transaction_id?: string;
    payment_method?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return false;
  }

  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: Timestamp.now(),
    };

    if (additionalData?.transaction_id) {
      updateData.transaction_id = additionalData.transaction_id;
    }
    if (additionalData?.payment_method) {
      updateData.payment_method = additionalData.payment_method;
    }
    if (additionalData?.metadata) {
      updateData.metadata = additionalData.metadata;
    }

    await db.collection('payments').doc(reference).update(updateData);
    return true;
  } catch (error) {
    console.error('Error updating payment status:', error);
    return false;
  }
}

export async function getPaymentRecord(reference: string): Promise<PaymentRecord | null> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }

  try {
    const paymentDoc = await db.collection('payments').doc(reference).get();

    if (!paymentDoc.exists) {
      return null;
    }

    return paymentDoc.data() as PaymentRecord;
  } catch (error) {
    console.error('Error fetching payment record:', error);
    return null;
  }
}

export async function getUserUsageStats(uid: string): Promise<UsageStats> {
  const db = getAdminDb();
  if (!db) {
    console.error('Firestore not initialized');
    return {
      workspacesCount: 0,
      fileUploadsThisMonth: 0,
      aiQueriesToday: 0,
      flashcardsCount: 0,
    };
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [workspacesSnapshot, filesSnapshot, statsDoc, flashcardsSnapshot] = await Promise.all([
      db.collection('workspaces').where('user_id', '==', uid).get(),
      db.collection('files').where('user_id', '==', uid).get(),
      db.collection('usage_stats').doc(uid).get(),
      db.collection('flashcards').where('user_id', '==', uid).get(),
    ]);

    const workspacesCount = workspacesSnapshot.size;

    let fileUploadsThisMonth = 0;
    filesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.created_at) {
        const createdDate = data.created_at.toDate();
        const createdMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        if (createdMonth === currentMonth) {
          fileUploadsThisMonth++;
        }
      }
    });

    let aiQueriesToday = 0;
    if (statsDoc.exists) {
      const data = statsDoc.data() as UsageStatsDoc;
      if (data.last_ai_query_date === todayStr) {
        aiQueriesToday = data.ai_queries_today;
      }
    }

    const flashcardsCount = flashcardsSnapshot.size;

    return {
      workspacesCount,
      fileUploadsThisMonth,
      aiQueriesToday,
      flashcardsCount,
    };
  } catch (error) {
    console.error('Error fetching user usage stats:', error);
    return {
      workspacesCount: 0,
      fileUploadsThisMonth: 0,
      aiQueriesToday: 0,
      flashcardsCount: 0,
    };
  }
}

export async function incrementAiQueryCount(uid: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) {
    return false;
  }

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const statsRef = db.collection('usage_stats').doc(uid);

    await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);

      if (!statsDoc.exists) {
        transaction.set(statsRef, {
          ai_queries_today: 1,
          last_ai_query_date: todayStr,
        });
        return;
      }

      const data = statsDoc.data() as UsageStatsDoc;

      if (data.last_ai_query_date !== todayStr) {
        // New day, reset count
        transaction.update(statsRef, {
          ai_queries_today: 1,
          last_ai_query_date: todayStr,
        });
      } else {
        // Same day, increment atomically
        transaction.update(statsRef, {
          ai_queries_today: FieldValue.increment(1),
        });
      }
    });

    return true;
  } catch (error) {
    console.error('Error incrementing AI query count:', error);
    return false;
  }
}

/**
 * Checks if a matric number for a specific institution has been used for a trial
 */
export async function checkMatricNumberEligibility(
  institution: string,
  matricNumber: string,
): Promise<{ eligible: boolean; userId?: string }> {
  const db = getAdminDb();
  if (!db) return { eligible: false };

  try {
    const slugifiedInstitution = institution
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-');
    const docId = `${slugifiedInstitution}_${matricNumber.toLowerCase().trim()}`;

    const doc = await db.collection('matric_numbers').doc(docId).get();

    if (doc.exists) {
      return { eligible: false, userId: doc.data()?.user_id };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Error checking matric number eligibility:', error);
    return { eligible: false };
  }
}

/**
 * Registers a matric number for an institution
 */
export async function registerMatricNumber(
  institution: string,
  matricNumber: string,
  userId: string,
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  try {
    const slugifiedInstitution = institution
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-');
    const docId = `${slugifiedInstitution}_${matricNumber.toLowerCase().trim()}`;

    await db.collection('matric_numbers').doc(docId).set({
      institution,
      matric_number: matricNumber,
      user_id: userId,
      registered_at: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Error registering matric number:', error);
    return false;
  }
}

/**
 * Admin utility to list pending verifications
 */
export async function getPendingVerifications() {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection('users')
      .where('verification_status', '==', 'pending')
      .orderBy('verification_submitted_at', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...(doc.data() as UserDocData),
    }));
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return [];
  }
}
