import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authFallback as auth } from '@/lib/auth';

export async function GET() {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    type Row = {
      id: string;
      status: string;
      filename: string | null;
      sourceType: string;
      dialect: string | null;
      total_items: number;
      processed_items: number;
      created_at: Date;
      finished_at: Date | null;
    };
    const jobs = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT id, status, filename, "sourceType" as "sourceType", dialect, total_items, processed_items, created_at, finished_at
       FROM ingestion_jobs ORDER BY created_at DESC LIMIT 20`
    );
    return NextResponse.json(jobs.map((j) => ({
      id: j.id,
      status: j.status,
      filename: j.filename,
      sourceType: j.sourceType,
      dialect: j.dialect,
      totalItems: j.total_items,
      processedItems: j.processed_items,
      createdAt: j.created_at,
      finishedAt: j.finished_at,
    })));
  } catch (error) {
    console.error('Ingestion history error:', error);
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}
