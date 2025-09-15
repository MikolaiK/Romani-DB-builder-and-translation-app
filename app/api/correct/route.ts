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

    // Trigger the learning loop asynchronously (fire-and-forget)
    if (wasCorrection) {
      const triggerLearningLoop = async () => {
        try {
          // Generate learning insight using the AI analyzer
          const insightData = await generateLearningInsight(
            sourceText.trim(),
            originalTranslation,
            correctedTranslation.trim(),
            dialect || 'Lovari',
            domain || '',
            [] // Empty tags array for now
          );

          // Only proceed if we got insight data
          if (insightData) {
            console.log("✅ Generated learning insight:", insightData);
            
            // Generate embedding for the rule
            const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect: dialect as 'Lovari' | 'Kelderash' | 'Arli' | undefined });
            console.log("✅ Generated rule embedding with length:", ruleEmbedding.length);

            // Save the learning insight to the database
            const learningInsight = await prisma.learningInsight.create({
              data: {
                rule: insightData.rule,
                category: insightData.category,
                confidence: insightData.confidence,
                explanation: insightData.explanation,
                sourceTranslationMemoryId: translation.id,
                domain: domain,
                tags: [], // Empty tags array for now
              }
            });
            console.log("✅ Created learning insight in database:", learningInsight.id);
            
            // Update the embedding using raw SQL
            try {
              console.log("🔍 Updating learning insight embedding for ID:", learningInsight.id);
              await prisma.$executeRawUnsafe(
                `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
                `[${ruleEmbedding.join(',')}]`,
                learningInsight.id
              );
              console.log("✅ Successfully updated learning insight embedding");
            } catch (e) {
              console.error('Failed to store learning insight embedding, continuing without it:', e);
            }
          }
        } catch (error) {
          console.error("Failed to generate learning insight:", error);
        }
      };

      // Fire-and-forget: Call without await
      triggerLearningLoop();
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
