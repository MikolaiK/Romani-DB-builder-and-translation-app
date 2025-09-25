import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { PreparedPayload } from './ingestion';
// no config import needed here

// Initialize Google AI provider
// Primary is configurable; we default to 2.5-pro, but fall back to 2.5-flash on schema edge-cases
const PRIMARY_MODEL_NAME = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-pro';
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
// Dedicated translate API key support
const TRANSLATE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE || process.env.GEMINI_TRANSLATE_API_KEY;
const ACTIVE_TRANSLATE_KEY = TRANSLATE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// Configure a provider with the translate API key
const PRIMARY_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(PRIMARY_MODEL_NAME)
  : google(PRIMARY_MODEL_NAME);
const FALLBACK_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(FALLBACK_MODEL_NAME)
  : google(FALLBACK_MODEL_NAME);
const HAS_AI_KEY = !!ACTIVE_TRANSLATE_KEY;
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS || '400', 10);
const MAX_OUTPUT_TOKENS_PRIMARY = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '2048', 10);
const MAX_OUTPUT_TOKENS_FALLBACK = parseInt(process.env.GEMINI_FALLBACK_MAX_OUTPUT_TOKENS || '1536', 10);

export interface TranslationRequest {
  sourceText: string;
  context?: string;
  domain?: string;
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  style?: 'Neutral' | 'Formal' | 'Informal';
  examples?: Array<{
    sourceText: string;
    targetText: string; // Prefer correctedText upstream
    context?: string | null;
  }>;
  retrievalData?: {
    learningInsights: import('./retrieval').LearningInsightResult[];
    grammarRules: import('./retrieval').GrammarResult[];
    vocabulary: import('./retrieval').LexiconResult[];
    examples: import('./retrieval').TranslationExample[];
  };
}

export interface TranslationResponse {
  translatedText: string;
  confidence: number;
  explanation?: string;
  modelUsed?: string;
  attempts?: number;
}

export { buildTranslationPrompt };

export async function translateText({
  sourceText,
  context,
  domain,
  dialect,
  style,
  examples,
  retrievalData
}: TranslationRequest): Promise<TranslationResponse> {
  if (!HAS_AI_KEY) {
    throw Object.assign(new Error('MODEL_UNAVAILABLE: Missing GOOGLE_GENERATIVE_AI_API_KEY'), {
      code: 'MODEL_UNAVAILABLE',
      attempts: 0,
    });
  }

  // Use structured prompt when retrieval data is provided, otherwise use the old prompt
  const prompt = retrievalData
    ? buildStructuredTranslationPrompt(sourceText, context, domain, dialect, style, retrievalData)
    : buildTranslationPrompt(sourceText, context, domain, dialect, style, (examples || []).slice(0, 12));

  const call = async (useFallback = false, overrideMaxTokens?: number) => {
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    const maxTokens = overrideMaxTokens ?? (useFallback ? MAX_OUTPUT_TOKENS_FALLBACK : MAX_OUTPUT_TOKENS_PRIMARY);
    const { text } = await generateText({
      model,
      prompt,
      maxTokens,
      temperature: 0.2,
    });
    return text;
  };

  let text = '';
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // First half of attempts use primary; later attempts try fallback model
      const useFallback = attempt > Math.max(1, Math.ceil(MAX_RETRIES / 2));
      try {
        text = await call(useFallback);
      } catch (err: unknown) {
        const msg = String((err as Error)?.message || '');
        const isSchemaEdgeCase = msg.includes('content') && msg.includes('parts') && msg.includes('Required');
        const isMaxTokenFinish = msg.includes('MAX_TOKENS');
        // Handle Gemini 2.5 occasional empty parts bug by trying: fallback model, then reduced tokens
        if (isSchemaEdgeCase || isMaxTokenFinish) {
          console.warn('[AI] Detected Gemini schema edge-case (missing parts or MAX_TOKENS). Applying immediate fallback...');
          try {
            // immediate model fallback
            text = await call(true, Math.min(MAX_OUTPUT_TOKENS_FALLBACK, 1024));
          } catch {
            // reduced token retry on primary
            text = await call(false, 768);
          }
        } else {
          throw err;
        }
      }
      const response = parseTranslationResponse(text || '');
      response.modelUsed = useFallback ? FALLBACK_MODEL_NAME : PRIMARY_MODEL_NAME;
      response.attempts = attempt;
      return response;
    } catch (e) {
      lastErr = e;
      const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`[AI] ${PRIMARY_MODEL_NAME} attempt ${attempt} failed, retrying in ${backoff}ms`, e);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
    }
  }

  throw Object.assign(new Error(`MODEL_UNAVAILABLE: Failed after ${MAX_RETRIES} attempts`), {
    code: 'MODEL_UNAVAILABLE',
    attempts: MAX_RETRIES,
    cause: lastErr,
  });
}

function buildTranslationPrompt(text: string, context?: string, domain?: string, dialect?: TranslationRequest['dialect'], style?: TranslationRequest['style'], examples?: TranslationRequest['examples']): string {
  const examplesBlock = (examples && examples.length)
    ? `\nUse these high-quality examples as guidance (prefer style and terms). Quote them explicitly before translating:\n` +
      examples.slice(0, 12).map((ex, i) => `Example ${i+1}:\nSwedish: ${ex.sourceText}\nRomani: ${ex.targetText}${ex.context ? `\nContext: ${ex.context}` : ''}`).join('\n\n') + '\n'
    : '';
  return `
You are an expert Swedish to Romani translator. Translate the following Swedish text to Romani.

Swedish text: "${text}"
${context ? `Context: ${context}` : ''}
${domain ? `Domain: ${domain}` : ''}
${dialect ? `Dialect: ${dialect}` : ''}
${style && style !== 'Neutral' ? `Style: ${style}` : ''}
${examplesBlock}

Please provide ALL of the following in this exact format:
Translation: [romani text]
Confidence: [0-100]
Explanation: [1-2 short sentences in Swedish on key choices or terms]

Constraints:
- Keep the response concise. Avoid any hidden or internal reasoning.
- Do NOT include analysis steps; just produce the final answers in three lines.
- Stay within 40 tokens for the translation and 1-2 short sentences for the explanation.
- Provide the explanation in Swedish, not in English.
`.trim();
}

/**
* Build a structured translation prompt that incorporates learning insights, grammar rules,
 * vocabulary, and examples from all four data sources
 */
export function buildStructuredTranslationPrompt(
  text: string,
  context?: string,
  domain?: string,
  dialect?: TranslationRequest['dialect'],
  style?: TranslationRequest['style'],
  retrievalData?: {
    learningInsights: import('./retrieval').LearningInsightResult[];
    grammarRules: import('./retrieval').GrammarResult[];
    vocabulary: import('./retrieval').LexiconResult[];
    examples: import('./retrieval').TranslationExample[];
  }
): string {
  // Format learning insights
  const insightsBlock = retrievalData?.learningInsights && retrievalData.learningInsights.length > 0
    ? `Learning Insights (apply these rules):\n` +
      retrievalData.learningInsights
        .slice(0, 5)
        .map(insight => `- ${insight.insight.rule} (confidence: ${Math.round(insight.insight.confidence * 100)}%)${insight.insight.explanation ? ` - ${insight.insight.explanation}` : ''}`)
        .join('\n') + '\n'
    : '';

  // Format grammar rules
  const grammarBlock = retrievalData?.grammarRules && retrievalData.grammarRules.length > 0
    ? `Grammar Rules:\n` +
      retrievalData.grammarRules
        .slice(0, 5)
        .map(rule => `- ${rule.content}`)
        .join('\n') + '\n'
    : '';

  // Format vocabulary
  const vocabularyBlock = retrievalData?.vocabulary && retrievalData.vocabulary.length > 0
    ? `Vocabulary:\n` +
      retrievalData.vocabulary
        .slice(0, 10)
        .map(entry => `- ${entry.sourceText} → ${entry.targetText}`)
        .join('\n') + '\n'
    : '';

  // Format examples
  const examplesBlock = retrievalData?.examples && retrievalData.examples.length > 0
    ? `Translation Examples:\n` +
      retrievalData.examples
        .slice(0, 5)
        .map(example => `Swedish: ${example.sourceText}\nRomani: ${example.correctedText || example.targetText}${example.context ? `\nContext: ${example.context}` : ''}`)
        .join('\n\n') + '\n'
    : '';

  return `
You are an expert Swedish to Romani translator with deep knowledge of grammar, vocabulary, and translation patterns.

Translate the following Swedish text to Romani, applying all relevant rules and patterns.

Swedish text: "${text}"
${context ? `Context: ${context}` : ''}
${domain ? `Domain: ${domain}` : ''}
${dialect ? `Dialect: ${dialect}` : ''}
${style && style !== 'Neutral' ? `Style: ${style}` : ''}

${insightsBlock}
${grammarBlock}
${vocabularyBlock}
${examplesBlock}

Please provide ALL of the following in this exact format:
Translation: [romani text]
Confidence: [0-100]
Explanation: [1-2 short sentences in Swedish on key choices or terms]

Constraints:
- Keep the response concise. Avoid any hidden or internal reasoning.
- Do NOT include analysis steps; just produce the final answers in three lines.
- Stay within 40 tokens for the translation and 1-2 short sentences for the explanation.
- Apply the learning insights, grammar rules, and vocabulary as appropriate to the translation.
- Provide the explanation in Swedish, not in English.
`.trim();
}

function parseTranslationResponse(text: string): TranslationResponse {
  const lines = text.split('\n');
  let translatedText = '';
  let confidence = 80; // default
  let explanation = '';

  for (const line of lines) {
    if (line.startsWith('Translation:')) {
      translatedText = line.replace('Translation:', '').trim();
    } else if (line.startsWith('Confidence:')) {
      const confidenceStr = line.replace('Confidence:', '').trim();
      confidence = parseInt(confidenceStr) || 80;
    } else if (line.startsWith('Explanation:')) {
      explanation = line.replace('Explanation:', '').trim();
    }
  }

  return {
    translatedText: translatedText || text.trim(),
    confidence,
    explanation: explanation || undefined,
  };
}

export async function testAIConnection(): Promise<boolean> {
  try {
  await translateText({ sourceText: "Hej" });
    console.log('✅ AI connection test passed');
    return true;
  } catch (error) {
    console.error('❌ AI connection test failed:', error);
    return false;
  }
}

// Use the model to extract a structured payload from arbitrary language resources
export async function extractIngestionStructure(rawText: string, sourceType?: string): Promise<PreparedPayload> {
  if (!HAS_AI_KEY) {
    // Fallback: empty; caller should apply heuristics
    return { grammarChunks: [], vocabPairs: [], parallelPairs: [] };
  }

  // Create dynamic schema and prompt based on sourceType
  let schema = '';
  let rules = '';
  
  if (sourceType === 'parallel') {
    schema = `{
    "parallelPairs": { sv: string; rmn: string; }[]; // aligned sentence pairs
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Only extract parallel sentence pairs in the format { sv: string; rmn: string; }[].\n- Skip any vocabulary or grammar content.\n`;
  } else if (sourceType === 'vocab') {
    schema = `{
    "vocabPairs": { swedish: string; romani: string; }[]; // term or phrase pairs
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Only extract vocabulary pairs in the format { swedish: string; romani: string; }[].\n- Pair Swedish (sv) with Romani (rmn) when obvious.\n- Skip any parallel sentences or grammar content.\n`;
  } else if (sourceType === 'grammar') {
    schema = `{
    "grammarChunks": string[]; // standalone explanations or sections
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Extract grammar rules as complete units when possible.\n- Only split into multiple chunks if there are clearly separate grammar rules.\n- Keep chunks <= 200 characters.\n- Skip any vocabulary or parallel sentence content.\n`;
  } else {
    // Default/fallback - extract all types
    schema = `{
    "grammarChunks": string[]; // standalone explanations or sections
    "vocabPairs": { swedish: string; romani: string; }[]; // term or phrase pairs
    "parallelPairs": { sv: string; rmn: string; }[]; // aligned sentence pairs
  }`;
    rules = `Rules:\n- No markdown, code fences, or prose.\n- Deduplicate and keep items clean.\n- Keep chunks <= 800 characters.\n- For vocab, pair Swedish (sv) with Romani (rmn) when obvious.\n- If uncertain, skip the item.\n`;
  }

  const prompt = `You are a Romani language data preparer. Read the document and produce ONLY minified JSON matching this TypeScript-like schema:\n${schema}\n
${rules}
Document:\n\n${rawText}`;

  const call = async (useFallback = false) => {
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    const maxTokens = useFallback ? MAX_OUTPUT_TOKENS_FALLBACK : MAX_OUTPUT_TOKENS_PRIMARY;
    const { text } = await generateText({ model, prompt, maxTokens, temperature: 0.1 });
    return text;
  };

  let out = '';
  try {
    try {
      out = await call(false);
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || '');
      const isSchemaEdgeCase = msg.includes('parts') || msg.includes('MAX_TOKENS');
      if (isSchemaEdgeCase) out = await call(true);
      else throw err;
    }
    const jsonStart = out.indexOf('{');
    const jsonEnd = out.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 ? out.slice(jsonStart, jsonEnd + 1) : out;
    const data: unknown = JSON.parse(jsonStr);
    // shallow validate
    const isVocab = (p: unknown): p is { swedish: unknown; romani: unknown } =>
      !!p && typeof p === 'object' && 'swedish' in (p as object) && 'romani' in (p as object);
    const isParallel = (p: unknown): p is { sv: unknown; rmn: unknown } =>
      !!p && typeof p === 'object' && 'sv' in (p as object) && 'rmn' in (p as object);

    const d = data as Record<string, unknown>;
    return {
      grammarChunks: Array.isArray(d.grammarChunks) ? d.grammarChunks.map((s: unknown) => String(s)).slice(0, 500) : [],
      vocabPairs: Array.isArray(d.vocabPairs)
        ? d.vocabPairs
            .filter(isVocab)
            .map((p) => ({ swedish: String(p.swedish ?? ''), romani: String(p.romani ?? '') }))
            .filter((p) => p.swedish && p.romani)
            .slice(0, 1000)
        : [],
      parallelPairs: Array.isArray(d.parallelPairs)
        ? d.parallelPairs
            .filter(isParallel)
            .map((p) => ({ sv: String(p.sv ?? ''), rmn: String(p.rmn ?? '') }))
            .filter((p) => p.sv && p.rmn)
            .slice(0, 1000)
        : [],
    };
  } catch {
    // If model fails or returns invalid JSON, return empty; caller may fallback
    return { grammarChunks: [], vocabPairs: [], parallelPairs: [] };
  }
}
