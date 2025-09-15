import { generateEmbedding } from './lib/embedding';
import { hybridSearch } from './lib/retrieval';

async function main() {
  try {
    console.log('🧪 Testing pipeline with 1536 dimensions...');
    
    // Test embedding generation
    const testText = 'Hej, hur mår du?';
    const embedding = await generateEmbedding(testText);
    
    console.log(`✅ Generated ${embedding.length}D embedding for: "${testText}"`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => (v as number).toFixed(4)).join(', ')}...]`);
    
    if (embedding.length !== 1536) {
      throw new Error(`Dimension mismatch: ${embedding.length} !== 1536`);
    }
    
    // Test search (this will connect to the database)
    console.log('🔍 Testing search functionality...');
    const results = await hybridSearch('hej');
    console.log(`✅ Search returned ${results.length} results`);
    
    console.log('✅ Pipeline test completed successfully');
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    process.exit(1);
  }
}

main();
