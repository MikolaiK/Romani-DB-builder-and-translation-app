import { NextRequest, NextResponse } from 'next/server';
import { authFallback as auth } from '@/lib/auth';
import { runIngestion } from '@/lib/ingestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // JSON body
      const body = await request.json();
      const { rawText, sourceType, dialect, filename } = body || {};
      if (!rawText || !sourceType) {
        return NextResponse.json({ error: 'rawText and sourceType are required' }, { status: 400 });
      }
      const { jobId } = await runIngestion(String(rawText), {
        sourceType,
        dialect: dialect || undefined,
        filename: filename || undefined,
      });
      return NextResponse.json({ jobId });
    } else if (contentType.includes('multipart/form-data')) {
      // FormData with file
      const form = await request.formData();
      const file = form.get('file') as File | null;
      const sourceType = (String(form.get('sourceType') || 'raw') as 'grammar' | 'vocab' | 'parallel' | 'raw');
      const dialect = form.get('dialect') ? (String(form.get('dialect')) as 'Lovari' | 'Kelderash' | 'Arli') : undefined;
      if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

      const lower = (file.name || '').toLowerCase();
      let text = '';
      if (lower.endsWith('.docx')) {
        const buf = Buffer.from(await file.arrayBuffer());
        const mammothMod: unknown = await import('mammoth');
  const mammothLib = (mammothMod as { default?: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }; extractRawText?: (opts: { buffer: Buffer }) => Promise<{ value: string }> });
  const extract = (mammothLib.default?.extractRawText || mammothLib.extractRawText) as (opts: { buffer: Buffer }) => Promise<{ value: string }>;
        const result = await extract({ buffer: buf });
        text = (result && result.value) || '';
      } else if (lower.endsWith('.pdf')) {
        const buf = Buffer.from(await file.arrayBuffer());
        const pdfParseMod: unknown = await import('pdf-parse');
        const pdfParseFn = ((pdfParseMod as { default?: (b: Buffer) => Promise<{ text: string }> })
          .default || (pdfParseMod as unknown as (b: Buffer) => Promise<{ text: string }>));
        const result = await pdfParseFn(buf as Buffer);
        text = (result && result.text) || '';
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        return NextResponse.json({ error: 'Unable to extract text from the uploaded file.' }, { status: 400 });
      }

      const { jobId } = await runIngestion(text, {
        sourceType,
        dialect,
        filename: file.name,
      });
      return NextResponse.json({ jobId });
    } else {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
    }
  } catch (error) {
    console.error('Ingestion upload error:', error);
    return NextResponse.json({ error: 'Failed to start ingestion' }, { status: 500 });
  }
}
