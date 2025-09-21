import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { authFallback as auth } from '@/lib/auth';
import { generateLearningInsight } from '@/lib/ai-analyzer';
import type { QualityScore } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const { userId } = auth();
    if (requireAuth && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const {
      sourceText,
      originalTranslation,
      correctedTranslation,
      context,
      domain,
      dialect,
    } = await request.json();

  console.log('🔔 /api/correct called with', { sourceText: sourceText?.slice?.(0,200), originalTranslation, correctedTranslation, context, domain, dialect });

    if (!sourceText?.trim() || !correctedTranslation?.trim()) {
      return NextResponse.json(
        { error: 'Source text and corrected translation are required' },
        { status: 400 }
      );
    }

  // Generate a single combined embedding for source + corrected (or target)
  const combinedText = `${sourceText}\n${correctedTranslation}`;
  const combinedEmbedding = await generateEmbedding(combinedText, { dialect });

    // Determine quality score based on whether correction was made
    const wasCorrection = originalTranslation !== correctedTranslation;
    const qualityScore: QualityScore = wasCorrection ? 'B' : 'A'; // Corrected = B, Approved = A

  // Debug log to confirm whether we detected a correction
  console.log('🪪 Debug: originalTranslation=', originalTranslation, 'correctedTranslation=', correctedTranslation, 'wasCorrection=', wasCorrection);

    // Save to database (without embeddings first)
    type CreateTranslationMemoryInput = {
      sourceText: string;
      targetText?: string | null;
      correctedText?: string | null;
      context?: string | null;
      domain?: string | null;
      qualityScore: QualityScore;
      reviewStatus: string;
      reviewedBy?: string | null;
      reviewedAt?: Date | null;
    };

    const data: CreateTranslationMemoryInput = {
      sourceText: sourceText.trim(),
      targetText: originalTranslation,
      correctedText: wasCorrection ? correctedTranslation.trim() : null,
      context: context?.trim() || null,
      domain: domain?.trim() || null,
      qualityScore,
      reviewStatus: 'APPROVED',
      reviewedBy: userId,
      reviewedAt: new Date(),
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translation = await prisma.translationMemory.create({ data: data as any });

    // Persist dialect using raw SQL to avoid client type drift
    try {
  const DIALECTS = ['Lovari','Kelderash','Arli'] as const;
  type DialectType = (typeof DIALECTS)[number];
  const d = (typeof dialect === 'string' && (DIALECTS as readonly string[]).includes(dialect)) ? (dialect as DialectType) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE translation_memory SET dialect = $1::"Dialect" WHERE id = $2`,
        d,
        translation.id
      );
    } catch (e) {
      console.error('Failed to set dialect column:', e);
    }

    // Persist combined embedding using raw SQL for pgvector column
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE translation_memory SET embedding = $1::vector WHERE id = $2`,
        `[${combinedEmbedding.join(',')}]`,
        translation.id
      );
    } catch (e) {
      console.error('Failed to store embedding, continuing without it:', e);
    }

    // If there was a correction, also save the correction details
    if (wasCorrection) {
      await prisma.correction.create({
        data: {
          translationId: translation.id,
          originalText: originalTranslation,
          correctedText: correctedTranslation.trim(),
          correctionType: 'OTHER', // Could be more sophisticated
          severity: 'MODERATE',
          explanation: 'Expert correction provided',
        },
      });
    }

    // Trigger the learning loop asynchronously but await it (bounded) so Vercel doesn't kill it
    if (wasCorrection) {
        const triggerLearningLoop = async (translationId: string) => {
          // create a small run id for tracing across logs
          const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          console.log('\ud83d\udd14 Starting learning loop (correction) run:', runId, 'translationId:', translationId);
          try {
            // Re-fetch the translation row to avoid any closure/race issues
            const row = await prisma.translationMemory.findUnique({ where: { id: translationId } });
            if (!row) {
              console.warn('[learning-loop] translation row not found for id:', translationId);
              return;
            }

            const dialectRow = (row.dialect as string) || 'Lovari';
            const domainRow = row.domain || '';
            const src = row.sourceText || '';
            const original = row.targetText || '';
            const corrected = row.correctedText || row.targetText || '';

            console.log('[learning-loop]', runId, 'using source snippet:', src.slice(0,80));

            // Generate learning insight using the AI analyzer with fresh DB values
            const insightData = await generateLearningInsight(
              src,
              original,
              corrected,
              dialectRow,
              domainRow,
              [] // tags
            );

            // Only proceed if we got insight data
            if (insightData) {
              console.log('[learning-loop]', runId, '\u2705 Generated learning insight:', insightData);

              // Create a placeholder learning insight immediately to reserve association with this translation
              const placeholder = await prisma.learningInsight.create({
                data: {
                  rule: insightData.rule.slice(0, 64), // short provisional text
                  category: insightData.category,
                  confidence: insightData.confidence || 0,
                  explanation: insightData.explanation?.slice?.(0, 200) || '',
                  sourceTranslationMemoryId: translationId,
                  domain: domainRow || null,
                  tags: [],
                }
              });
              console.log('[learning-loop]', runId, '\u2705 Created placeholder learning insight in database:', placeholder.id);

              // Generate embedding for the rule
              const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect: dialectRow as 'Lovari' | 'Kelderash' | 'Arli' | undefined });
              console.log('[learning-loop]', runId, '\u2705 Generated rule embedding with length:', ruleEmbedding.length);

              // Update the placeholder row with final values
              try {
                const updated = await prisma.learningInsight.update({ where: { id: placeholder.id }, data: {
                  rule: insightData.rule,
                  explanation: insightData.explanation,
                  confidence: insightData.confidence,
                }});
                console.log('[learning-loop]', runId, '\u2705 Updated placeholder with final insight:', updated.id);

                // Update the embedding using raw SQL
                await prisma.$executeRawUnsafe(
                  `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
                  `[${ruleEmbedding.join(',')}]`,
                  updated.id
                );
                console.log('[learning-loop]', runId, '\u2705 Successfully updated learning insight embedding');
              } catch (e) {
                console.error('[learning-loop] Failed to update placeholder or embedding:', e);
              }
            }
          } catch (error) {
            console.error('[learning-loop] Failed to generate learning insight:', error);
          }
        };

      // Await the loop (bounded) so serverless doesn't kill it prematurely
      try {
        // Synchronously await the learning loop to enforce correct ordering while debugging
        console.log('[learning-loop] awaiting learning loop synchronously for id:', translation.id);
        await triggerLearningLoop(translation.id);
        console.log('[learning-loop] completed for id:', translation.id);
      } catch (e) {
        console.error('Learning loop failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      translationId: translation.id,
      wasCorrection,
    });
  } catch (error) {
    console.error('Correction API error:', error);
    return NextResponse.json(
      { error: 'Failed to save correction' },
      { status: 500 }
    );
  }
}
