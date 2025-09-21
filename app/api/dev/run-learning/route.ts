import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';
import { generateLearningInsight } from '@/lib/ai-analyzer';

export async function POST(request: NextRequest) {
  try {
    const { id, aiTranslation } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const row = await prisma.translationMemory.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    type Dialect = 'Lovari' | 'Kelderash' | 'Arli';
  const DIALECTS = ['Lovari','Kelderash','Arli'] as const;
  const dialect = (typeof row.dialect === 'string' && DIALECTS.includes(row.dialect as Dialect)) ? (row.dialect as Dialect) : 'Lovari';

    const insightData = await generateLearningInsight(
      row.sourceText,
      aiTranslation || row.targetText || '',
      row.correctedText || row.targetText || '',
      dialect,
      row.domain || '',
      []
    );

    if (!insightData) return NextResponse.json({ error: 'No insight generated' }, { status: 500 });

  const ruleEmbedding = await generateEmbedding(insightData.rule, { dialect });

    const learningInsight = await prisma.learningInsight.create({
      data: {
        rule: insightData.rule,
        category: insightData.category,
        confidence: insightData.confidence,
        explanation: insightData.explanation,
        sourceTranslationMemoryId: id,
        domain: row.domain || null,
        tags: [],
      }
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
        `[${ruleEmbedding.join(',')}]`,
        learningInsight.id
      );
    } catch (e) {
      console.error('Failed to update learning insight embedding', e);
    }

    return NextResponse.json({ success: true, id: learningInsight.id });
  } catch (e) {
    console.error('Dev run-learning error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
