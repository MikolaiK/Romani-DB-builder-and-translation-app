import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { authFallback as auth } from '@/lib/auth';
import { generateLearningInsight } from '@/lib/ai-analyzer';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 /api/review/correct called');
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const { id, correctedText, initialAiTranslation, notes, qualityScore } = await request.json();
    if (!id || !correctedText?.trim()) {
      return NextResponse.json({ error: 'Missing id or correctedText' }, { status: 400 });
    }

    // Fetch the translation memory entry to get source text and dialect
  const rows = await prisma.$queryRawUnsafe<{ source_text: string; target_text: string; dialect: string | null; domain: string | null; tags: string[] | null }[]>(
      'SELECT source_text, target_text, dialect, domain, tags FROM translation_memory WHERE id = $1',
      id,
    );
    
    if (!rows.length) {
      return NextResponse.json({ error: 'Translation not found' }, { status: 404 });
    }
    
    const { source_text: sourceText, target_text: targetText, dialect: dialectRaw, domain, tags } = rows[0];
  type Dialect = 'Lovari' | 'Kelderash' | 'Arli';
  let dialect = dialectRaw as string | undefined;
    if (dialect !== 'Lovari' && dialect !== 'Kelderash' && dialect !== 'Arli') {
      dialect = undefined;
    }
  const typedDialect = dialect as Dialect | undefined;

    const updated = await prisma.translationMemory.update({
      where: { id },
      data: {
        correctedText: correctedText.trim(),
        reviewNotes: notes || null,
        ...(qualityScore ? { qualityScore } : {}),
        reviewStatus: 'APPROVED',
        reviewedBy: userId || 'dev-user',
        reviewedAt: new Date(),
      },
    });
  console.log('🪪 Debug: review correction updated id=', updated.id, 'initialAiTranslation=', initialAiTranslation);
    const combined = `${sourceText ?? ''}\n${correctedText.trim()}`;
    const combinedEmbedding = await generateEmbedding(combined, { dialect: typedDialect });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE translation_memory SET embedding = $1::vector WHERE id = $2`,
        `[${combinedEmbedding.join(',')}]`,
        updated.id
      );
    } catch (e) {
      console.error('Failed to update corrected embedding:', e);
    }

    await prisma.correction.create({
      data: {
        translationId: updated.id,
        originalText: targetText,
        correctedText: correctedText.trim(),
        correctionType: 'OTHER',
        severity: 'MODERATE',
        explanation: notes || 'Batch/inline correction',
      },
    });

    // Trigger the learning loop asynchronously but await it (bounded) so Vercel doesn't kill it
    if (initialAiTranslation) {
      const triggerLearningLoop = async (translationId: string) => {
        const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        console.log('[learning-loop-review]', runId, 'starting for id:', translationId);
        try {
          const row = await prisma.translationMemory.findUnique({ where: { id: translationId } });
          if (!row) {
            console.warn('[learning-loop-review] row not found for', translationId);
            return;
          }

          const dialectRow = (row.dialect as string) || '';
          const domainRow = row.domain || '';
          const src = row.sourceText || '';
          const orig = row.targetText || '';
          const corr = row.correctedText || row.targetText || '';

          const insightData = await generateLearningInsight(
            src,
            initialAiTranslation,
            corr,
            dialectRow,
            domainRow,
            row.tags || []
          );

          if (!insightData) return;

          // create placeholder row so we have a stable id associated with this translation
          const placeholder = await prisma.learningInsight.create({
            data: {
              rule: insightData.rule.slice(0, 64),
              category: insightData.category,
              confidence: insightData.confidence || 0,
              explanation: insightData.explanation?.slice?.(0,200) || '',
              sourceTranslationMemoryId: translationId,
              domain: domainRow || null,
              tags: row.tags || [],
            }
          });

          const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect: dialectRow as any });

          try {
            const updated = await prisma.learningInsight.update({ where: { id: placeholder.id }, data: {
              rule: insightData.rule,
              explanation: insightData.explanation,
              confidence: insightData.confidence,
            }});
            await prisma.$executeRawUnsafe(
              `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
              `[${ruleEmbedding.join(',')}]`,
              updated.id
            );
          } catch (e) {
            console.error('[learning-loop-review] failed to update placeholder or embedding', e);
          }
        } catch (e) {
          console.error('[learning-loop-review] error', e);
        }
      };

      try {
        console.log('[learning-loop-review] awaiting learning loop synchronously for id:', updated.id);
        await triggerLearningLoop(updated.id);
        console.log('[learning-loop-review] completed for id:', updated.id);
      } catch (e) {
        console.error('Learning loop failed:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inline Correction API error:', error);
    return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 });
  }
}
