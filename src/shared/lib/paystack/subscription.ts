import type {
  InitializePaymentParams,
  InitializePaymentResponse,
  VerifyPaymentParams,
  VerifyPaymentResponse,
  ListTransactionsParams,
  ListTransactionsResponse,
  CreateCustomerParams,
  CreateCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerResponse,
  isPaystackConfigured,
} from './client';

export type SubscriptionPlan = 'free' | 'premium_monthly' | 'premium_annual';

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  priceKobo: number;
  priceNaira: number;
  interval: 'monthly' | 'annual';
  trialDays: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  workspaces: number | 'unlimited';
  fileUploads: number | 'unlimited';
  aiQueriesPerDay: number | 'unlimited';
  flashcards: number | 'unlimited';
  tutorPersonalities: string[];
  spacedRepetition: boolean;
  analytics: 'basic' | 'full';
  collaboration: boolean;
  exportPdf: boolean;
  exportAnki: boolean;
  offlineMode: boolean;
  prioritySupport: boolean;
  earlyAccess: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free',
    priceKobo: 0,
    priceNaira: 0,
    interval: 'monthly',
    trialDays: 0,
    features: {
      workspaces: 1,
      fileUploads: 3,
      aiQueriesPerDay: 5,
      flashcards: 10,
      tutorPersonalities: ['mentor'],
      spacedRepetition: false,
      analytics: 'basic',
      collaboration: false,
      exportPdf: false,
      exportAnki: false,
      offlineMode: false,
      prioritySupport: false,
      earlyAccess: false,
    },
  },
  premium_monthly: {
    id: 'premium_monthly',
    name: 'Premium',
    priceKobo: 200000,
    priceNaira: 2000,
    interval: 'monthly',
    trialDays: 2,
    features: {
      workspaces: 'unlimited',
      fileUploads: 'unlimited',
      aiQueriesPerDay: 50,
      flashcards: 'unlimited',
      tutorPersonalities: ['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'],
      spacedRepetition: true,
      analytics: 'full',
      collaboration: true,
      exportPdf: true,
      exportAnki: true,
      offlineMode: true,
      prioritySupport: false,
      earlyAccess: false,
    },
  },
  premium_annual: {
    id: 'premium_annual',
    name: 'Annual',
    priceKobo: 2000000,
    priceNaira: 20000,
    interval: 'annual',
    trialDays: 7,
    features: {
      workspaces: 'unlimited',
      fileUploads: 'unlimited',
      aiQueriesPerDay: 200,
      flashcards: 'unlimited',
      tutorPersonalities: ['mentor', 'drill', 'peer', 'professor', 'storyteller', 'coach'],
      spacedRepetition: true,
      analytics: 'full',
      collaboration: true,
      exportPdf: true,
      exportAnki: true,
      offlineMode: true,
      prioritySupport: true,
      earlyAccess: true,
    },
  },
};

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: 'active' | 'inactive' | 'past_due';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  isTrial?: boolean;
  hasHadTrial?: boolean;
  paystackAuthorizationCode?: string;
  matricNumber?: string;
  institution?: string;
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  verificationMediaUrl?: string;
  verificationSubmittedAt?: Date;
}

export interface UsageStats {
  workspacesCount: number;
  fileUploadsThisMonth: number;
  aiQueriesToday: number;
  flashcardsCount: number;
}

export type FeatureKey = keyof PlanFeatures;

const PREMIUM_FEATURES: FeatureKey[] = [
  'workspaces',
  'fileUploads',
  'aiQueriesPerDay',
  'flashcards',
  'tutorPersonalities',
  'spacedRepetition',
  'analytics',
  'collaboration',
  'exportPdf',
  'exportAnki',
  'offlineMode',
  'prioritySupport',
  'earlyAccess',
];

export function canAccessFeature(
  userSubscription: UserSubscription | null,
  feature: FeatureKey,
): boolean {
  if (!userSubscription) {
    return !PREMIUM_FEATURES.includes(feature);
  }

  if (userSubscription.status !== 'active') {
    return !PREMIUM_FEATURES.includes(feature);
  }

  const planDetails = getPlanDetails(userSubscription.plan);
  const featureValue = planDetails.features[feature];
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }
  if (typeof featureValue === 'number') {
    return featureValue > 0;
  }
  return featureValue === 'unlimited';
}

export function checkUserLimits(
  userSubscription: UserSubscription | null,
  usage: UsageStats,
): {
  canProceed: boolean;
  exceededLimits?: string[];
  upgradeRequired?: boolean;
} {
  const exceededLimits: string[] = [];
  const planKey =
    userSubscription && userSubscription.status === 'active' ? userSubscription.plan : 'free';
  const plan = getPlanDetails(planKey);

  const workspaceLimit =
    plan.features.workspaces === 'unlimited' ? Infinity : plan.features.workspaces;
  if (usage.workspacesCount >= workspaceLimit) {
    exceededLimits.push('workspaces');
  }

  const fileUploadLimit =
    plan.features.fileUploads === 'unlimited' ? Infinity : plan.features.fileUploads;
  if (usage.fileUploadsThisMonth >= fileUploadLimit) {
    exceededLimits.push('fileUploads');
  }

  const aiQueryLimit =
    plan.features.aiQueriesPerDay === 'unlimited' ? Infinity : plan.features.aiQueriesPerDay;
  if (usage.aiQueriesToday >= aiQueryLimit) {
    exceededLimits.push('aiQueriesPerDay');
  }

  const flashcardLimit =
    plan.features.flashcards === 'unlimited' ? Infinity : plan.features.flashcards;
  if (usage.flashcardsCount >= flashcardLimit) {
    exceededLimits.push('flashcards');
  }

  const canProceed = exceededLimits.length === 0;

  return {
    canProceed,
    exceededLimits: exceededLimits.length > 0 ? exceededLimits : undefined,
    upgradeRequired: exceededLimits.length > 0 && planKey === 'free',
  };
}

export function getPlanDetails(plan: SubscriptionPlan): PlanDetails {
  return SUBSCRIPTION_PLANS[plan];
}

export function calculateSubscriptionExpiry(
  plan: SubscriptionPlan,
  startDate: Date = new Date(),
): Date {
  const endDate = new Date(startDate);

  if (plan === 'premium_monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (plan === 'premium_annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  return endDate;
}

export function formatPrice(kobo: number): string {
  const nairaAmount = kobo / 100;
  return `₦${nairaAmount.toLocaleString('en-NG')}`;
}

export function formatPriceNaira(priceKobo: number): string {
  const nairaAmount = priceKobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nairaAmount);
}

export function formatPriceDisplay(plan: SubscriptionPlan): string {
  const planDetails = getPlanDetails(plan);
  if (planDetails.priceNaira === 0) {
    return 'Free';
  }

  const formattedPrice = formatPriceNaira(planDetails.priceKobo);
  const intervalText = planDetails.interval === 'monthly' ? '/month' : '/year';
  return `${formattedPrice}${intervalText}`;
}

export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan === 'premium_monthly' || plan === 'premium_annual';
}

export function isPaidSubscription(userSubscription: UserSubscription | null): boolean {
  if (!userSubscription) {
    return false;
  }

  if (userSubscription.status !== 'active') {
    return false;
  }

  return isPaidPlan(userSubscription.plan);
}

export function getPlanIntervals(): Array<{ value: SubscriptionPlan; label: string }> {
  return [
    { value: 'free', label: 'Free' },
    { value: 'premium_monthly', label: 'Monthly' },
    { value: 'premium_annual', label: 'Annual' },
  ];
}

export function isSubscriptionActive(userSubscription: UserSubscription | null): boolean {
  if (!userSubscription) {
    return false;
  }

  return userSubscription.status === 'active';
}

export function getUpgradeMessage(exceededLimits: string[]): string {
  const limitMessages: Record<string, string> = {
    workspaces:
      'You have reached the maximum number of workspaces. Upgrade to Premium for unlimited workspaces.',
    fileUploads:
      'You have reached your monthly file upload limit. Upgrade to Premium for unlimited uploads.',
    aiQueriesPerDay:
      'You have reached your daily AI query limit. Upgrade to Premium for unlimited queries.',
    flashcards:
      'You have reached the maximum number of flashcards. Upgrade to Premium for unlimited flashcards.',
  };

  const messages = exceededLimits.map(
    (limit) => limitMessages[limit] || `You have reached your ${limit} limit.`,
  );
  return messages.join(' ');
}
