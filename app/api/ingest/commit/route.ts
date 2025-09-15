import { NextRequest, NextResponse } from 'next/server';
import { authFallback as auth } from '@/lib/auth';
import { commitPrepared, type PreparedPayload } from '@/lib/ingestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const prepared = body.prepared as PreparedPayload | undefined;
    const dialect = body.dialect as 'Lovari' | 'Kelderash' | 'Arli' | undefined;
    const filename = body.filename as string | undefined;
  const domain = body.domain as string | undefined;
  const tags = body.tags as string[] | undefined;
    if (!prepared) return NextResponse.json({ error: 'prepared is required' }, { status: 400 });

  const sourceType = body.sourceType as 'grammar' | 'vocab' | 'parallel' | 'raw' | undefined;
  const jobLabel = sourceType === 'grammar' ? 'grammar' : 'mixed';
  const { jobId } = await commitPrepared(prepared, { dialect, filename, jobSourceLabel: jobLabel, domain, tags });
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Commit ingestion error:', error);
    return NextResponse.json({ error: 'Failed to commit ingestion' }, { status: 500 });
  }
}
