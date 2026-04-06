import { NextRequest } from 'next/server';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { content, type } = await request.json();

    if (!content) {
      return errorResponse('Content is required', StatusCodes.BAD_REQUEST);
    }

    // Format message for WhatsApp
    let message = content;

    if (type === 'flashcard') {
      message = `📚 *Flashcard*\n\n${content}\n\n📖 Learn with *Exam-Killer*!`;
    } else if (type === 'quiz') {
      message = `📝 *Quiz Question*\n\n${content}\n\n🎯 Test yourself with Exam-Killer!`;
    } else {
      message = `${content}\n\n📚 Learn with Exam-Killer!`;
    }

    // Create WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return successResponse({
      share_url: whatsappUrl,
      message: message,
    });
  } catch (error: unknown) {
    console.error('WhatsApp share error:', error);
    return errorResponse('Failed to create share link', StatusCodes.INTERNAL_ERROR);
  }
});
