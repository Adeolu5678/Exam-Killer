import { NextRequest, NextResponse } from 'next/server';

import { jsPDF } from 'jspdf';
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

    if (!canAccessFeature(subscription, 'exportPdf')) {
      const blockedByVerification = isVerificationBlockingPremiumAccess(subscription);
      throw new AppError({
        code: 'EXPORT_REQUIRES_PREMIUM',
        message: blockedByVerification
          ? 'PDF export is paused until your student verification is restored.'
          : 'PDF export requires an active Premium subscription.',
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

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Flashcards Export', pageWidth / 2, margin, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Cards: ${flashcards.length}`, pageWidth / 2, margin + 8, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 14, {
      align: 'center',
    });

    let yPosition = margin + 25;
    let cardCount = 0;

    for (const flashcard of flashcards) {
      cardCount += 1;

      const frontLines = doc.splitTextToSize(flashcard.front, contentWidth - 10);
      const backLines = doc.splitTextToSize(flashcard.back, contentWidth - 10);
      const tagsText = flashcard.tags.join(', ');

      const cardHeight =
        10 + frontLines.length * 5 + 5 + backLines.length * 5 + (tagsText ? 8 : 0) + 10;

      if (yPosition + cardHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFillColor(240, 240, 250);
      doc.rect(margin - 5, yPosition - 5, contentWidth + 10, cardHeight - 5, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 180);
      doc.text(`Card ${cardCount}`, margin, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Q:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(frontLines, margin + 8, yPosition);
      yPosition += frontLines.length * 5;

      yPosition += 3;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 150, 50);
      doc.text('A:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(backLines, margin + 8, yPosition);
      yPosition += backLines.length * 5;

      if (tagsText) {
        yPosition += 3;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Tags: ${tagsText}`, margin, yPosition);
      }

      yPosition += 12;
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flashcards-${payload.workspace_id}.pdf"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
