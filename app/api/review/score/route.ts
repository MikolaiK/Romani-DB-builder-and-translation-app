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

    const body = await request.json();
    const items: Array<{ id: string; qualityScore: 'A'|'B'|'C'|'D' }>|undefined = body.items;
    const ids: string[]|undefined = body.ids;
    const qualityScore: 'A'|'B'|'C'|'D'|undefined = body.qualityScore;

    if ((!items || items.length === 0) && (!ids || !qualityScore)) {
      return NextResponse.json({ error: 'Provide items[] or ids[] + qualityScore' }, { status: 400 });
    }

    let count = 0;
    if (items && items.length) {
      // Update potentially different scores per id
      const tx = items.map(({ id, qualityScore }) =>
        prisma.translationMemory.update({
          where: { id },
          data: { qualityScore, reviewedBy: userId || 'dev-user', reviewedAt: new Date() },
        })
      );
      const res = await prisma.$transaction(tx);
      count = res.length;
    } else if (ids && qualityScore) {
      const res = await prisma.translationMemory.updateMany({
        where: { id: { in: ids } },
        data: { qualityScore, reviewedBy: userId || 'dev-user', reviewedAt: new Date() },
      });
      count = res.count;
    }

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Score API error:', error);
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
  }
}
