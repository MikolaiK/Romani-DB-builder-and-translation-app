import { NextRequest, NextResponse } from 'next/server';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { authFallback as auth } from '@/lib/auth';

// Initialize Google AI provider specifically for text generation with gemini-2.5-flash-lite
const PRIMARY_MODEL_NAME = process.env.GEMINI_GENERATE_TEXT_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODEL_NAME = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
const GENERATE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY_GENERATE || process.env.GOOGLE_GENERATIVE_AI_API_KEY_TRANSLATE || process.env.GEMINI_TRANSLATE_API_KEY;
const ACTIVE_GENERATE_KEY = GENERATE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const PRIMARY_MODEL = ACTIVE_GENERATE_KEY
 ? createGoogleGenerativeAI({ apiKey: ACTIVE_GENERATE_KEY })(PRIMARY_MODEL_NAME)
  : google(PRIMARY_MODEL_NAME);
const FALLBACK_MODEL = ACTIVE_GENERATE_KEY
  ? createGoogleGenerativeAI({ apiKey: ACTIVE_GENERATE_KEY })(FALLBACK_MODEL_NAME)
  : google(FALLBACK_MODEL_NAME);
const HAS_AI_KEY = !!ACTIVE_GENERATE_KEY;
const MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
const RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS || '400', 10);

// Define domain-specific prompts
const DOMAIN_PROMPTS: Record<string, string> = {
  medical: 'Generate a single, common Swedish medical sentence. Example: "Patienten klagade över huvudvärk."',
  legal: 'Generate a single, common Swedish legal sentence. Example: "Parterna ingår detta avtal frivilligt."',
  technical: 'Generate a single, common Swedish technical sentence. Example: "Systemet kräver en uppdatering av drivrutinerna."',
  literature: 'Generate a single, common Swedish literary sentence. Example: "Solen gick upp över den stilla sjön."',
 conversation: 'Generate a single, common Swedish conversational sentence. Example: "Hur mår du idag?"',
  general: 'Generate a single, common Swedish sentence for everyday use. Example: "Det är en vacker dag idag."'
};

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

    const { domain } = await request.json();

    // Validate input
    if (domain && typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Domain must be a string' },
        { status: 400 }
      );
    }

    // Determine the prompt based on the domain
    const selectedDomain = domain?.toLowerCase() || 'general';
    const prompt = DOMAIN_PROMPTS[selectedDomain] || DOMAIN_PROMPTS.general;

    if (!HAS_AI_KEY) {
      return NextResponse.json(
        { error: 'AI key not configured' },
        { status: 500 }
      );
    }

    // Use a resilient approach to generate text, similar to the translation API
    const call = async (useFallback = false, overrideMaxTokens?: number) => {
      const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
      const maxTokens = overrideMaxTokens ?? 100;
      const { text } = await generateText({
        model,
        prompt,
        maxTokens,
        temperature: 0.7, // Slightly higher for more varied output
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
            console.warn('[Generate Text] Detected Gemini schema edge-case (missing parts or MAX_TOKENS). Applying immediate fallback...');
            try {
              // immediate model fallback
              text = await call(true, Math.min(100, 1024));
            } catch {
              // reduced token retry on primary
              text = await call(false, 768);
            }
          } else {
            throw err;
          }
        }
        
        // Extract the sentence from the response (remove example part if present)
        let generatedText = text.trim();
        
        // If the AI returned an example format, extract just the sentence
        if (generatedText.includes('"')) {
          const matches = generatedText.match(/"([^"]+)"/);
          if (matches && matches[1]) {
            generatedText = matches[1];
          }
        }
        
        return NextResponse.json({
          swedish_text: generatedText,
        });
      } catch (e) {
        lastErr = e;
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`[Generate Text] ${PRIMARY_MODEL_NAME} attempt ${attempt} failed, retrying in ${backoff}ms`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
      }
    }

    throw new Error(`Failed to generate text after ${MAX_RETRIES} attempts`);
  } catch (error) {
    console.error('Generate text API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate text' },
      { status: 500 }
    );
  }
}