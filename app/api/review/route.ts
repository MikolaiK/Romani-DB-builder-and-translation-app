import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authFallback as auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const { id, action, notes, qualityScore } = await request.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT', 'NEEDS_REVISION'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const reviewStatus =
      action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'NEEDS_REVISION';

  const updated = await prisma.translationMemory.update({
      where: { id },
      data: {
    reviewStatus,
    ...(qualityScore ? { qualityScore } : {}),
        reviewNotes: notes || null,
        reviewedBy: userId || 'dev-user',
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, reviewStatus: updated.reviewStatus });
  } catch (error) {
    console.error('Review API error:', error);
    return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 });
  }
}
