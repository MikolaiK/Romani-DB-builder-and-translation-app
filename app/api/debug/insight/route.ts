import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const insights = await prisma.learningInsight.findMany({
      take: 10,
      select: {
        id: true,
        rule: true,
        category: true,
        confidence: true,
        explanation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Debug insight error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}