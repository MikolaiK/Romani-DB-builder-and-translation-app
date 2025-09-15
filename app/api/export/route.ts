import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'jsonl';
  const minQuality = (searchParams.get('minQuality') as 'A'|'B'|'C'|'D') || 'C';
  const dialect = searchParams.get('dialect') as 'Lovari' | 'Kelderash' | 'Arli' | null;

  const qualityOrder: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

  const rows = await prisma.translationMemory.findMany({
    where: {
      reviewStatus: 'APPROVED',
  qualityScore: { in: ['A','B','C','D'] as ('A'|'B'|'C'|'D')[] },
      ...(dialect ? { dialect } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const filtered = rows.filter(r => qualityOrder[r.qualityScore] >= qualityOrder[minQuality]);

  if (format === 'csv') {
  const header = 'source_text,target_text,corrected_text,context,domain,dialect,quality_score\n';
    const esc = (s: string) => s.replace(/"/g, '""');
    const csv = header + filtered.map(r => [
      esc(r.sourceText),
      esc(r.correctedText || r.targetText),
      esc(r.correctedText || ''),
      esc(r.context || ''),
  esc(r.domain || ''),
  esc((r.dialect as string) || ''),
      r.qualityScore
    ].map(v => `"${v}"`).join(',')).join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="translations.csv"',
      },
    });
  }

  // default jsonl
    const jsonl = filtered.map(r => JSON.stringify({
    source_text: r.sourceText,
    target_text: r.targetText,
    corrected_text: r.correctedText,
    final_text: r.correctedText || r.targetText,
    context: r.context,
    domain: r.domain,
  dialect: r.dialect as string | null,
    quality_score: r.qualityScore,
    reviewed_at: r.reviewedAt,
    reviewed_by: r.reviewedBy,
  })).join('\n');

  return new Response(jsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': 'attachment; filename="translations.jsonl"',
    },
  });
}
