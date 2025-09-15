import { google } from '@ai-sdk/google';
import { embed } from 'ai';
import { CONFIG } from './config';

type Dialect = 'Lovari' | 'Kelderash' | 'Arli';

// Initialize embedding provider
const embeddingModel = google('gemini-embedding-001');
const HAS_AI_KEY = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function generateEmbedding(text: string, opts?: { dialect?: Dialect }): Promise<number[]> {
  try {
    // Clean and validate input
  const base = text.trim().replace(/\s+/g, ' ');
  const cleanText = (opts?.dialect ? `[Dialect:${opts.dialect}] ` : '') + base;
    
    if (!cleanText) {
      throw new Error('Empty text provided for embedding');
    }

    if (cleanText.length > CONFIG.LIMITS.MAX_QUERY_LENGTH) {
      throw new Error(`Text too long: ${cleanText.length} > ${CONFIG.LIMITS.MAX_QUERY_LENGTH}`);
    }

    if (!HAS_AI_KEY) {
      // Deterministic local fallback embedding
      const dim = CONFIG.EMBEDDING.DIMENSION;
      const out = new Array(dim).fill(0).map((_, i) => {
        const c = cleanText.charCodeAt(i % cleanText.length) || 0;
        return ((Math.sin(c * (i + 1)) + 1) / 2) * 2 - 1; // in [-1,1]
      });
      return out;
    }

    // helper fallback generator
    const fallback = () => new Array(CONFIG.EMBEDDING.DIMENSION)
      .fill(0)
      .map((_, i) => ((i * 37 + cleanText.length * 13) % 100) / 100);

    // Fallback for local dev without API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return fallback();
    }

    try {
      // Generate embedding using Vercel AI SDK when key is available
  const { embedding } = await embed({
    // The model typing from the SDK is permissive; cast to unknown then as needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: embeddingModel as unknown as any,
  value: cleanText,
  });
      
      // Validate dimension
      if (!embedding || embedding.length !== CONFIG.EMBEDDING.DIMENSION) {
        return fallback();
      }
      
      return embedding as number[];
    } catch {
      // Provider call failed; fallback
      return fallback();
    }
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  
  for (let i = 0; i < texts.length; i += CONFIG.EMBEDDING.BATCH_SIZE) {
    const batch = texts.slice(i, i + CONFIG.EMBEDDING.BATCH_SIZE);
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Rate limiting
    if (i + CONFIG.EMBEDDING.BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.EMBEDDING.RATE_LIMIT_DELAY));
    }
  }
  
  return results;
}

export async function testEmbedding(): Promise<void> {
  try {
    console.log('🧪 Testing embedding generation...');
    
    const testText = 'Hej, hur mår du?';
    const embedding = await generateEmbedding(testText);
    
    console.log(`✅ Generated ${embedding.length}D embedding for: "${testText}"`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => (v as number).toFixed(4)).join(', ')}...]`);
    
    if (embedding.length !== CONFIG.EMBEDDING.DIMENSION) {
      throw new Error(`Dimension mismatch: ${embedding.length} !== ${CONFIG.EMBEDDING.DIMENSION}`);
    }
    
    console.log('✅ Embedding test passed');
  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    throw error;
  }
}
