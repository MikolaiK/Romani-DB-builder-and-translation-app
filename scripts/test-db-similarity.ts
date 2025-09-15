import { prisma } from '../lib/db';
import { generateEmbedding } from '../lib/embedding';

async function run() {
  try {
    console.log('Testing database semantic similarity calculation...');
    
    // Generate embedding for query "mor"
    const query = 'mor';
    const queryEmbedding = await generateEmbedding(query);
    const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`;
    
    console.log(`Query embedding for "${query}":`);
    console.log(`  Length: ${queryEmbedding.length}`);
    console.log(`  First 5 values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    // Test semantic similarity calculation in database
    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        source_text, 
        target_text,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score
      FROM romani_lexicon
      WHERE source_text = 'mor' AND target_text = 'dej'
      LIMIT 1
    `, queryEmbeddingStr) as unknown as Record<string, unknown>[];
    
    if (results.length > 0) {
      const result = results[0];
      console.log(`\nDatabase similarity result for "mor - dej":`);
      console.log(`  Source: ${result.source_text}`);
      console.log(`  Target: ${result.target_text}`);
      console.log(`  Semantic score: ${(result.semantic_score as number).toFixed(4)}`);
    } else {
      console.log('Entry not found in database');
    }
    
    // Test with a few other entries to see their semantic scores
    console.log('\nTesting with other entries:');
    const otherResults = await prisma.$queryRawUnsafe(`
      SELECT 
        source_text, 
        target_text,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score
      FROM romani_lexicon
      ORDER BY COALESCE(1 - (embedding <=> $1::vector), 0) DESC
      LIMIT 5
    `, queryEmbeddingStr) as unknown as Record<string, unknown>[];
    
    otherResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.source_text}" -> "${result.target_text}": ${(result.semantic_score as number).toFixed(4)}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);