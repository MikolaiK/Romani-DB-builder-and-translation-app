import { NextRequest, NextResponse } from 'next/server';
import { authFallback as auth } from '@/lib/auth';
import { extractIngestionStructure } from '@/lib/ai';
import { splitGrammar, splitParallel, splitVocabList, type PreparedPayload } from '@/lib/ingestion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function parseFileToText(request: NextRequest): Promise<{ text: string; filename?: string }> {
  const form = await request.formData();
  const file = form.get('file') as File | null;
  if (!file) throw new Error('file is required');
  const lower = (file.name || '').toLowerCase();
  if (lower.endsWith('.docx')) {
    const buf = Buffer.from(await file.arrayBuffer());
    const mammothMod: unknown = await import('mammoth');
    const mammothLib = (mammothMod as { default?: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> }; extractRawText?: (opts: { buffer: Buffer }) => Promise<{ value: string }> });
    const extract = (mammothLib.default?.extractRawText || mammothLib.extractRawText) as (opts: { buffer: Buffer }) => Promise<{ value: string }>;
    const result = await extract({ buffer: buf });
    return { text: result.value || '', filename: file.name };
  }
  if (lower.endsWith('.pdf')) {
    const buf = Buffer.from(await file.arrayBuffer());
    const pdfParseMod: unknown = await import('pdf-parse');
    const pdfParseFn = ((pdfParseMod as { default?: (b: Buffer) => Promise<{ text: string }> }).default || (pdfParseMod as unknown as (b: Buffer) => Promise<{ text: string }>));
    const result = await pdfParseFn(buf as Buffer);
    return { text: result.text || '', filename: file.name };
  }
  return { text: await file.text(), filename: file.name };
}

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentType = request.headers.get('content-type') || '';
  let rawText = '';
  let filename: string | undefined;
  let sourceType: string | undefined;
  let domain: string | undefined;
  let tags: string | undefined;
    if (contentType.includes('application/json')) {
      const body = await request.json();
      rawText = String(body.rawText || '');
      filename = body.filename ? String(body.filename) : undefined;
      sourceType = body.sourceType ? String(body.sourceType) : undefined;
  domain = body.domain ? String(body.domain) : undefined;
  tags = body.tags ? String(body.tags) : undefined;
    } else if (contentType.includes('multipart/form-data')) {
      const { text, filename: fn } = await parseFileToText(request);
      rawText = text;
      filename = fn;
      const form = await request.formData();
      sourceType = form.get('sourceType') ? String(form.get('sourceType')) : undefined;
  domain = form.get('domain') ? String(form.get('domain')) : undefined;
  tags = form.get('tags') ? String(form.get('tags')) : undefined;
    } else {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
    }
    if (!rawText.trim()) return NextResponse.json({ error: 'Empty text' }, { status: 400 });

    // Try AI extraction; fallback to heuristics
    let prepared: PreparedPayload = await extractIngestionStructure(rawText, sourceType);
    if (
      (!prepared.grammarChunks?.length) && (!prepared.vocabPairs?.length) && (!prepared.parallelPairs?.length)
    ) {
      prepared = {
        grammarChunks: splitGrammar(rawText),
        vocabPairs: sourceType === 'grammar' ? [] : splitVocabList(rawText),
        parallelPairs: splitParallel(rawText),
      };
    } else if (sourceType === 'grammar' && prepared.grammarChunks && prepared.grammarChunks.length > 1) {
      // For grammar source type, if AI extracted multiple chunks, combine them into one
      // This preserves the original text structure when it's a single coherent rule
      const firstLine = rawText.split(/\r?\n/)[0] || '';
      if ((firstLine.startsWith('#') || firstLine.includes(' in ')) && rawText.length < 4000) {
        prepared.grammarChunks = [rawText.trim()];
      } else if (rawText.length < 2000 && (rawText.includes('Rule:') || rawText.includes('**Rule**') || rawText.includes('__Rule__'))) {
        prepared.grammarChunks = [rawText.trim()];
      }
    }

    // Safeguard filter to ensure only the relevant data structures are passed downstream
    if (sourceType === 'parallel') {
      prepared.vocabPairs = [];
      prepared.grammarChunks = [];
    }
    if (sourceType === 'vocab') {
      prepared.parallelPairs = [];
      prepared.grammarChunks = [];
    }
    if (sourceType === 'grammar') {
      prepared.vocabPairs = [];
      prepared.parallelPairs = [];
    }

  const counts = {
      grammar: prepared.grammarChunks.length,
      vocab: prepared.vocabPairs.length,
      parallel: prepared.parallelPairs.length,
    };
  const meta = { domain: domain || null, tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [] };
  return NextResponse.json({ prepared, counts, filename, meta });
  } catch (error) {
    console.error('Prepare ingestion error:', error);
    return NextResponse.json({ error: 'Failed to prepare ingestion' }, { status: 500 });
  }
}
