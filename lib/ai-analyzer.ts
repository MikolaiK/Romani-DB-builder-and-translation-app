import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Initialize Google AI provider using the same pattern as the translation service
const PRIMARY_MODEL_NAME = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
const TRANSLATE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE || process.env.GEMINI_TRANSLATE_API_KEY;
const ACTIVE_TRANSLATE_KEY = TRANSLATE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const PRIMARY_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(PRIMARY_MODEL_NAME)
  : google(PRIMARY_MODEL_NAME);
const FALLBACK_MODEL = ACTIVE_TRANSLATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_TRANSLATE_KEY })(FALLBACK_MODEL_NAME)
  : google(FALLBACK_MODEL_NAME);
const HAS_AI_KEY = !!ACTIVE_TRANSLATE_KEY;
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS || '400', 10);

// Define the structure for a learning insight
export interface LearningInsight {
  rule: string;
  category: string;
  confidence: number;
  explanation: string;
}

/**
 * Generate a learning insight from a translation correction
 * @param sourceText The original source text
 * @param aiTranslation The initial AI translation
 * @param expertCorrection The expert-corrected translation
 * @param dialect The dialect of the target language
 * @param domain The domain/context of the translation
 * @param tags Tags associated with the translation
 * @returns A structured learning insight
 */
export async function generateLearningInsight(
  sourceText: string,
  aiTranslation: string,
  expertCorrection: string,
  dialect: string,
  domain: string,
  tags: string[]
): Promise<LearningInsight | null> {
  if (!HAS_AI_KEY) {
    console.warn('AI key not available for generating learning insights');
    return null;
  }

  try {
    // Construct the prompt for the AI to analyze the correction
    const prompt = `
      Analyze the following translation correction and extract a generalizable rule:
      
      Source text: "${sourceText}"
      AI translation: "${aiTranslation}"
      Expert correction: "${expertCorrection}"
      Target dialect: ${dialect}
      Domain: ${domain}
      Tags: ${tags.join(", ")}
      
      Please provide:
      1. A concise rule that captures the correction pattern
      2. A category for this rule (e.g., grammar, vocabulary, cultural context)
      3. A confidence score between 0 and 1
      4. A brief explanation of why this rule is important
      
      Respond in JSON format:
      {
        "rule": "string",
        "category": "string",
        "confidence": number,
        "explanation": "string"
      }
    `;

    const call = async (useFallback = false) => {
      const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.2,
      });
      return text;
    };

    let text = '';
    let lastErr: unknown = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const useFallback = attempt > Math.max(1, Math.ceil(MAX_RETRIES / 2));
        text = await call(useFallback);
        
        // Parse the JSON response
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}") + 1;
        const jsonString = text.substring(jsonStart, jsonEnd);
        
        // Validate that we have a valid JSON string
        if (jsonString.length > 0) {
          const insight: LearningInsight = JSON.parse(jsonString);
          return insight;
        }
      } catch (e) {
        lastErr = e;
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`[AI Analyzer] Attempt ${attempt} failed, retrying in ${backoff}ms`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
      }
    }

    console.error("Failed to generate learning insight after retries:", lastErr);
    return null;
  } catch (error) {
    console.error("Error generating learning insight:", error);
    return null;
  }
}