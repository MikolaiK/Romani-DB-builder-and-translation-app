import { unifiedRetrieval } from './lib/retrieval';
import { generateEmbedding } from './lib/embedding';

async function testUnifiedRetrieval() {
  try {
    console.log('🔍 Testing unified retrieval...');
    
    // Test query
    const query = "Hello, how are you today?";
    
    // Test unifiedRetrieval
    const retrievalData = await unifiedRetrieval(query, {
      maxResults: 5,
      dialect: 'Lovari'
    });
    
    console.log('\n📊 Retrieval Results:');
    console.log(`Learning Insights: ${retrievalData.learningInsights.length}`);
    console.log(`Grammar Rules: ${retrievalData.grammarRules.length}`);
    console.log(`Vocabulary Entries: ${retrievalData.vocabulary.length}`);
    console.log(`Translation Examples: ${retrievalData.examples.length}`);
    
    // Display some vocabulary results
    if (retrievalData.vocabulary.length > 0) {
      console.log('\n📖 Top Vocabulary Entries:');
      retrievalData.vocabulary.slice(0, 3).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.sourceText} → ${entry.targetText}`);
      });
    }
    
    console.log('\n✅ Unified retrieval test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUnifiedRetrieval();