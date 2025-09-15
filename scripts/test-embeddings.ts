import { generateEmbedding } from '../lib/embedding';

async function run() {
  try {
    console.log('Testing embeddings...');
    
    const query = 'mor';
    const lexiconFormat = 'Swedish: mor ||| Romani: dej';
    
    const queryEmbedding = await generateEmbedding(query);
    const lexiconEmbedding = await generateEmbedding(lexiconFormat);
    
    console.log(`Query embedding for "${query}":`);
    console.log(`  Length: ${queryEmbedding.length}`);
    console.log(`  First 5 values: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    console.log(`\nLexicon embedding for "${lexiconFormat}":`);
    console.log(`  Length: ${lexiconEmbedding.length}`);
    console.log(`  First 5 values: [${lexiconEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    // Calculate cosine similarity
    const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * lexiconEmbedding[i], 0);
    const magnitude1 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(lexiconEmbedding.reduce((sum, val) => sum + val * val, 0));
    const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
    
    console.log(`\nCosine similarity: ${cosineSimilarity.toFixed(4)}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);