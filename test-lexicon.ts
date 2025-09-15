import { searchRomaniLexicon } from './lib/retrieval';
import { generateEmbedding } from './lib/embedding';

async function testLexicon() {
  try {
    console.log('🔍 Testing romani lexicon search...');
    
    // Test query
    const query = "Hello, how are you today?";
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    console.log(`✅ Generated embedding for query: "${query}"`);
    
    // Test searchRomaniLexicon
    const vocabulary = await searchRomaniLexicon(queryEmbedding, query, {
      maxResults: 5,
      dialect: 'Lovari'
    });
    
    console.log('\n📊 Lexicon Results:');
    console.log(`Vocabulary Entries: ${vocabulary.length}`);
    
    // Display some results
    if (vocabulary.length > 0) {
      console.log('\n📖 Top Vocabulary Entries:');
      vocabulary.slice(0, 3).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.sourceText} → ${entry.targetText}`);
      });
    }
    
    console.log('\n✅ Lexicon test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLexicon();