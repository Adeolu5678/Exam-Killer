import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { content, type } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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

    return NextResponse.json({
      share_url: whatsappUrl,
      message: message,
    });
  } catch (error: unknown) {
    console.error('WhatsApp share error:', error);
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
  }
}
