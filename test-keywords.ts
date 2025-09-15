import { unifiedRetrieval, extractKeywords } from './lib/retrieval';
import { generateEmbedding } from './lib/embedding';

async function testKeywords() {
  try {
    console.log('🔍 Testing unified retrieval with keywords...');
    
    // Test query in Swedish
    const query = "Hur mår du idag?";
    
    // Extract keywords
    const keywords = extractKeywords(query);
    console.log(`Keywords: ${keywords.join(', ')}`);
    
    // Test unifiedRetrieval without keywords
    console.log('\n--- Testing without keywords ---');
    const retrievalDataWithoutKeywords = await unifiedRetrieval(query, {
      maxResults: 5,
      dialect: 'Lovari'
    });
    
    console.log(`Vocabulary Entries (without keywords): ${retrievalDataWithoutKeywords.vocabulary.length}`);
    
    // Test unifiedRetrieval with keywords
    console.log('\n--- Testing with keywords ---');
    const retrievalDataWithKeywords = await unifiedRetrieval(query, {
      maxResults: 5,
      dialect: 'Lovari',
      keywords
    });
    
    console.log(`Vocabulary Entries (with keywords): ${retrievalDataWithKeywords.vocabulary.length}`);
    
    // Display some vocabulary results with keywords
    if (retrievalDataWithKeywords.vocabulary.length > 0) {
      console.log('\n📖 Top Vocabulary Entries (with keywords):');
      retrievalDataWithKeywords.vocabulary.slice(0, 3).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.sourceText} → ${entry.targetText}`);
      });
    }
    
    console.log('\n✅ Keywords test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testKeywords();