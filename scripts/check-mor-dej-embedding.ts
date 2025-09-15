import { prisma } from '../lib/db';
import { generateEmbedding } from '../lib/embedding';

async function run() {
  try {
    console.log('Checking embedding for "mor - dej" pair...');
    
    // Find the "mor - dej" pair in the database using raw SQL
    const entries = await prisma.$queryRawUnsafe(`
      SELECT id, created_at, updated_at, source_text, target_text, dialect, domain, provenance, tags, quality_score, review_status, embedding::text
      FROM romani_lexicon
      WHERE source_text = 'mor' AND target_text = 'dej'
      LIMIT 1
    `) as unknown as Record<string, unknown>[];
    
    if (entries.length === 0) {
      console.log('Entry not found in database');
      return;
    }
    
    const entry = entries[0];
    
    if (!entry) {
      console.log('Entry not found in database');
      return;
    }
    
    console.log(`Found entry: ${entry.source_text} -> ${entry.target_text}`);
    console.log(`Embedding: ${entry.embedding ? 'Exists' : 'Missing'}`);
    
    if (entry.embedding) {
      // Parse the embedding from the database
      const dbEmbedding = JSON.parse(entry.embedding as string) as number[];
      console.log(`Database embedding length: ${dbEmbedding.length}`);
      console.log(`First 5 values: [${dbEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      
      // Generate a new embedding for the same text
      const combinedText = `Swedish: ${entry.source_text} ||| Romani: ${entry.target_text}`;
      const newEmbedding = await generateEmbedding(combinedText);
      console.log(`\nGenerated embedding for "${combinedText}":`);
      console.log(`  Length: ${newEmbedding.length}`);
      console.log(`  First 5 values: [${newEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      
      // Calculate cosine similarity between database and generated embeddings
      const dotProduct = dbEmbedding.reduce((sum, val, i) => sum + val * newEmbedding[i], 0);
      const magnitude1 = Math.sqrt(dbEmbedding.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(newEmbedding.reduce((sum, val) => sum + val * val, 0));
      const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
      
      console.log(`\nCosine similarity between DB and generated embeddings: ${cosineSimilarity.toFixed(4)}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);