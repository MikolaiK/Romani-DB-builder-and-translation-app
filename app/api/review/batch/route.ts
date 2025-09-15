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

    const { ids, action, notes, qualityScore } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0 || !action) {
      return NextResponse.json({ error: 'Missing ids or action' }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT', 'NEEDS_REVISION'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const reviewStatus =
      action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'NEEDS_REVISION';

  const data: Parameters<typeof prisma.translationMemory.updateMany>[0]['data'] = {
      reviewStatus,
      reviewNotes: notes || null,
      reviewedBy: userId || 'dev-user',
      reviewedAt: new Date(),
    };
    if (qualityScore) data.qualityScore = qualityScore;

    const result = await prisma.translationMemory.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return NextResponse.json({ success: true, count: result.count, reviewStatus });
  } catch (error) {
    console.error('Batch Review API error:', error);
    return NextResponse.json({ error: 'Failed to update review batch' }, { status: 500 });
  }
}
