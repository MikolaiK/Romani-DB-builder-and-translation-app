import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { authFallback as auth } from '@/lib/auth';
import { generateLearningInsight } from '@/lib/ai-analyzer';

export async function POST(request: NextRequest) {
  try {
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

    // Trigger the learning loop asynchronously (fire-and-forget)
    if (initialAiTranslation) {
      const triggerLearningLoop = async () => {
        try {
          // Generate learning insight using the AI analyzer
          const insightData = await generateLearningInsight(
            sourceText,
            initialAiTranslation,
            correctedText.trim(),
            typedDialect || '',
            domain || '',
            tags || []
          );

          // Only proceed if we got insight data
          if (insightData) {
            // Generate embedding for the rule
            const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect: typedDialect });

            // Save the learning insight to the database
            const learningInsight = await prisma.learningInsight.create({
              data: {
                rule: insightData.rule,
                category: insightData.category,
                confidence: insightData.confidence,
                explanation: insightData.explanation,
                sourceTranslationMemoryId: updated.id,
                domain: domain,
                tags: tags || [],
              }
            });
            
            // Update the embedding using raw SQL
            await prisma.$executeRawUnsafe(
              `UPDATE learning_insight SET embedding = $1::vector WHERE id = $2`,
              `[${ruleEmbedding.join(',')}]`,
              learningInsight.id
            );
          }
        } catch (error) {
          console.error("Failed to generate learning insight:", error);
        }
      };

      // Fire-and-forget: Call without await
      triggerLearningLoop();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inline Correction API error:', error);
    return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 });
  }
}
