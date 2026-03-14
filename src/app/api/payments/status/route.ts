import { NextRequest } from 'next/server';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getUserSubscription, getUserUsageStats } from '@/shared/lib/paystack/db';
import {
  checkUserLimits,
  type UsageStats as SubscriptionUsageStats,
} from '@/shared/lib/paystack/subscription';

interface StatusResponse {
  subscription: {
    plan: 'free' | 'premium_monthly' | 'premium_annual';
    status: 'active' | 'inactive' | 'past_due';
    currentPeriodEnd?: string;
    isTrial?: boolean;
    hasHadTrial?: boolean;
  };
  usage?: {
    workspacesCount: number;
    fileUploadsThisMonth: number;
    aiQueriesToday: number;
    flashcardsCount: number;
  };
  limits: {
    canCreateWorkspace: boolean;
    canUploadFile: boolean;
    canUseAI: boolean;
    canCreateFlashcard: boolean;
    canUseSpacedRepetition: boolean;
    canCollaborate: boolean;
    canExport: boolean;
  };
}

function mapUsageStats(usage: SubscriptionUsageStats): StatusResponse['usage'] {
  return {
    workspacesCount: usage.workspacesCount,
    fileUploadsThisMonth: usage.fileUploadsThisMonth,
    aiQueriesToday: usage.aiQueriesToday,
    flashcardsCount: usage.flashcardsCount,
  };
}

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const subscription = await getUserSubscription(userId);
    const usage = await getUserUsageStats(userId);

    const subscriptionPlan = subscription?.plan || 'free';
    const subscriptionStatus = subscription?.status || 'inactive';

    const usageResult = checkUserLimits(subscription, usage);

    const response: StatusResponse = {
      subscription: {
        plan: subscriptionPlan,
        status: subscriptionStatus,
        currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString(),
        isTrial: subscription?.isTrial,
        hasHadTrial: subscription?.hasHadTrial,
      },
      usage: mapUsageStats(usage),
      limits: {
        canCreateWorkspace: !usageResult.exceededLimits?.includes('workspaces'),
        canUploadFile: !usageResult.exceededLimits?.includes('fileUploads'),
        canUseAI: !usageResult.exceededLimits?.includes('aiQueriesPerDay'),
        canCreateFlashcard: !usageResult.exceededLimits?.includes('flashcards'),
        canUseSpacedRepetition:
          subscription?.status === 'active' &&
          (subscription.plan === 'premium_monthly' || subscription.plan === 'premium_annual'),
        canCollaborate:
          subscription?.status === 'active' &&
          (subscription.plan === 'premium_monthly' || subscription.plan === 'premium_annual'),
        canExport:
          subscription?.status === 'active' &&
          (subscription.plan === 'premium_monthly' || subscription.plan === 'premium_annual'),
      },
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get subscription status error:', error);
    return errorResponse('Failed to get subscription status', StatusCodes.INTERNAL_ERROR);
  }
});
