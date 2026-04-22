import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { listFlashcardsForExport } from '@/domains/flashcards';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { getUserSubscription } from '@/shared/lib/paystack/db';
import {
  canAccessFeature,
  isVerificationBlockingPremiumAccess,
} from '@/shared/lib/paystack/subscription';
import { apiError } from '@/shared/lib/rebuild/api/responses';
import { AppError, AuthenticationError } from '@/shared/lib/rebuild/errors';

const exportRequestSchema = z.object({
  workspace_id: z.string().min(1),
  source_id: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const payload = exportRequestSchema.parse(await request.json());
    const subscription = await getUserSubscription(user.uid);

    if (!canAccessFeature(subscription, 'exportAnki')) {
      const blockedByVerification = isVerificationBlockingPremiumAccess(subscription);
      throw new AppError({
        code: 'EXPORT_REQUIRES_PREMIUM',
        message: blockedByVerification
          ? 'Anki export is paused until your student verification is restored.'
          : 'Anki export requires an active Premium subscription.',
        status: 403,
        details: {
          upgradeRequired: !blockedByVerification,
          verificationRequired: blockedByVerification,
        },
      });
    }

    const flashcards = await listFlashcardsForExport({
      userId: user.uid,
      workspaceId: payload.workspace_id,
      sourceId: payload.source_id,
      topic: payload.topic,
    });

    const BOM = '\uFEFF';
    let csvContent = `${BOM}front,back,tags\n`;

    for (const flashcard of flashcards) {
      const front = flashcard.front.replace(/"/g, '""');
      const back = flashcard.back.replace(/"/g, '""');
      const tags = flashcard.tags.join(';');
      csvContent += `"${front}","${back}","${tags}"\n`;
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="flashcards-anki-${payload.workspace_id}.csv"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
