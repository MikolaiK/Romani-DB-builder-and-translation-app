import { NextRequest, NextResponse } from 'next/server';
import { translateText, buildTranslationPrompt, buildStructuredTranslationPrompt } from '@/lib/ai';
import { unifiedRetrieval, hybridSearch, extractKeywords } from '@/lib/retrieval';
import { authFallback as auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Simple auth check (optional in local dev)
    const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (requireAuth) {
      const { userId } = auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

  const { sourceText, context, domain, dialect, style } = await request.json();

    if (!sourceText?.trim()) {
      return NextResponse.json(
        { error: 'Source text is required' },
        { status: 400 }
      );
    }

    // Extract keywords from the source text for smarter search
    const keywords = extractKeywords(sourceText.trim());
    
    // Search for similar translations first (for backward compatibility)
    const similarTranslations = await hybridSearch(sourceText.trim(), {
      maxResults: 20,
      domain,
      dialect,
      keywords, // Pass extracted keywords for pre-filtering
    });

    // Perform unified retrieval from all four data sources
    const retrievalData = await unifiedRetrieval(sourceText.trim(), {
      maxResults: 20, // Increase results for better AI context
      domain,
      dialect,
      keywords, // Pass extracted keywords for pre-filtering
    });

    // Build the structured prompt incorporating all data sources
    const structuredPrompt = buildStructuredTranslationPrompt(
      sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      retrievalData
    );

    // Get AI translation with structured prompt
    const aiResult = await translateText({
      sourceText: sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      // Pass retrieval data to use the structured prompt
      retrievalData,
    });

    // Also get translation with old prompt for comparison
    const oldPrompt = buildTranslationPrompt(
      sourceText.trim(),
      context,
      domain,
      dialect,
      style,
      retrievalData.examples.map(example => ({
        sourceText: example.sourceText,
        targetText: example.correctedText || example.targetText,
        context: example.context || null,
      })).slice(0, 3)
    );

    return NextResponse.json({
      translatedText: aiResult.translatedText,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      modelUsed: aiResult.modelUsed,
      attempts: aiResult.attempts,
      retrievalData: {
        learningInsights: retrievalData.learningInsights,
        grammarRules: retrievalData.grammarRules,
        vocabulary: retrievalData.vocabulary,
        examples: retrievalData.examples,
      },
      debugInfo: {
        prompt: structuredPrompt,
        oldPrompt,
        retrievalParams: {
          maxResults: 20,
          domain,
          dialect,
        },
        examplesWithSource: similarTranslations.map(result => {
          // Determine which table the translation came from based on available fields
          let tableName = 'translation_memory';
          // romani_lexicon has quality_score and review_status as NULL but has targetText
          if (result.translation.qualityScore === null && result.translation.reviewStatus === null && result.translation.targetText) {
            tableName = 'romani_lexicon';
          }
          // romani_grammar and romani_style both have targetText as NULL
          else if (!result.translation.targetText) {
            // Distinguish between romani_grammar and romani_style based on sourceText length
            // Grammar entries are typically longer than style entries
            tableName = result.translation.sourceText.length > 200 ? 'romani_grammar' : 'romani_style';
          }

          return {
            translation: {
              id: result.translation.id,
              sourceText: result.translation.sourceText,
              targetText: result.translation.correctedText || result.translation.targetText,
              context: result.translation.context,
              domain: result.translation.domain,
              dialect: result.translation.dialect,
            },
            tableName,
            scoringDetails: {
              semanticScore: result.semanticScore,
              lexicalScore: result.lexicalScore,
              exactMatchBoost: result.exactMatchBoost || 0,
              qualityBoost: result.qualityBoost,
              correctedBoost: result.correctedBoost || 0,
              recencyBoost: result.recencyBoost,
              finalScore: result.score
            }
          };
        })
      }
    });
  } catch (error) {
    console.error('Translation API error:', error);
    // Bubble a structured error so UI can show retry/connected state
    const err = error as { code?: string; attempts?: number };
    const code = err?.code || 'UNKNOWN';
    const attempts = err?.attempts || 0;
    const message = code === 'MODEL_UNAVAILABLE' ? 'Gemini 2.5 model unavailable. Retried and failed.' : 'Translation failed';
    return NextResponse.json({ error: message, code, attempts }, { status: 503 });
  }
}
