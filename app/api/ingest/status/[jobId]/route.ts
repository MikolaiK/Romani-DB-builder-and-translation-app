import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authFallback as auth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  type JobRow = { id: string; status: string; total_items: number; processed_items: number; started_at: Date | null; finished_at: Date | null; error_message: string | null };
  const jobRows = await prisma.$queryRawUnsafe<JobRow[]>(
      `SELECT id, status, total_items, processed_items, started_at, finished_at, error_message
       FROM ingestion_jobs WHERE id = $1 LIMIT 1`,
      jobId
    );
    if (!jobRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const job = jobRows[0];
    const pct = job.total_items > 0 ? Math.round((job.processed_items / job.total_items) * 100) : 0;
  type RecRow = { id: string; preview: string | null; status: 'INSERTED' | 'FAILED' };
  const recs = await prisma.$queryRawUnsafe<RecRow[]>(
      `SELECT id, preview, status FROM ingestion_records WHERE job_id = $1 ORDER BY created_at DESC LIMIT 10`,
      jobId
    );
    return NextResponse.json({
      id: job.id,
      status: job.status,
      totalItems: job.total_items,
      processedItems: job.processed_items,
      progress: pct,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      errorMessage: job.error_message,
      sample: recs,
    });
  } catch (error) {
    console.error('Ingestion status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
