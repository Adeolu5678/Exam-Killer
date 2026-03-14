import { NextRequest, NextResponse } from 'next/server';

import { jsPDF } from 'jspdf';

import { withAuth, parseBody, errorResponse, StatusCodes } from '@/shared/lib/api/auth';

interface ExportRequest {
  workspace_id: string;
  source_id?: string;
  topic?: string;
}

export const POST = withAuth(async (request: NextRequest, { db, userId }) => {
  const body = await parseBody<ExportRequest>(request);

  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { workspace_id, source_id, topic } = body;

  if (!workspace_id) {
    return errorResponse('Workspace ID is required', StatusCodes.BAD_REQUEST);
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspace_id).get();

  if (!workspaceDoc.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  const workspaceData = workspaceDoc.data();

  if (!workspaceData || workspaceData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  let query = db.collection('flashcards').where('workspace_id', '==', workspace_id);
  const flashcardsSnapshot = await query.get();

  let flashcards = flashcardsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      front: data.front || '',
      back: data.back || '',
      tags: data.tags || [],
      source_id: data.source_id || null,
    };
  });

  if (source_id) {
    flashcards = flashcards.filter((card) => card.source_id === source_id);
  }

  if (topic) {
    flashcards = flashcards.filter((card: { tags: string[] }) =>
      card.tags.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase())),
    );
  }

  if (flashcards.length === 0) {
    return errorResponse('No flashcards found', StatusCodes.NOT_FOUND);
  }

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
    cardCount++;

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
      'Content-Disposition': `attachment; filename="flashcards-${workspace_id}.pdf"`,
    },
  });
});
