import { unifiedRetrieval } from './lib/retrieval';
import { buildStructuredTranslationPrompt } from './lib/ai';

async function testTranslationAPI() {
  try {
    console.log('🔍 Testing translation API with multi-source retrieval...');
    
    // Test query
    const query = "Hello, how are you today?";
    
    // Perform unified retrieval
    const retrievalData = await unifiedRetrieval(query, {
      maxResults: 5,
      dialect: 'Lovari'
    });
    
    console.log('\n📊 Retrieval Results:');
    console.log(`Learning Insights: ${retrievalData.learningInsights.length}`);
    console.log(`Grammar Rules: ${retrievalData.grammarRules.length}`);
    console.log(`Vocabulary Entries: ${retrievalData.vocabulary.length}`);
    console.log(`Translation Examples: ${retrievalData.examples.length}`);
    
    // Display some vocabulary entries
    if (retrievalData.vocabulary.length > 0) {
      console.log('\n📖 Vocabulary Entries:');
      retrievalData.vocabulary.slice(0, 3).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.sourceText} → ${entry.targetText}`);
      });
    }
    
    // Build structured prompt
    const structuredPrompt = buildStructuredTranslationPrompt(
      query,
      'Casual conversation',
      'General',
      'Lovari',
      'Neutral',
      retrievalData
    );
    
    console.log('\n📝 Full Structured Prompt:');
    console.log(structuredPrompt);
    
    console.log('\n✅ Translation API test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTranslationAPI();