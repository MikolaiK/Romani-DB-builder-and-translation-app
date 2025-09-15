import { unifiedRetrieval } from './lib/retrieval';
import { generateEmbedding } from './lib/embedding';

async function testRetrieval() {
  try {
    console.log('🔍 Testing unified retrieval system...');
    
    // Test query
    const query = "How are you?";
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    console.log(`✅ Generated embedding for query: "${query}"`);
    
    // Test unified retrieval
    const retrievalData = await unifiedRetrieval(query, {
      maxResults: 5,
      dialect: 'Lovari'
    });
    
    console.log('\n📊 Retrieval Results:');
    console.log(`Learning Insights: ${retrievalData.learningInsights.length}`);
    console.log(`Grammar Rules: ${retrievalData.grammarRules.length}`);
    console.log(`Vocabulary Entries: ${retrievalData.vocabulary.length}`);
    console.log(`Translation Examples: ${retrievalData.examples.length}`);
    
    // Display some results
    if (retrievalData.learningInsights.length > 0) {
      console.log('\n🧠 Top Learning Insights:');
      retrievalData.learningInsights.slice(0, 3).forEach((insight, index) => {
        console.log(`${index + 1}. ${insight.insight.rule} (confidence: ${Math.round(insight.insight.confidence * 100)}%)`);
      });
    }
    
    if (retrievalData.grammarRules.length > 0) {
      console.log('\n📚 Top Grammar Rules:');
      retrievalData.grammarRules.slice(0, 3).forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.content.substring(0, 100)}...`);
      });
    }
    
    if (retrievalData.vocabulary.length > 0) {
      console.log('\n📖 Top Vocabulary Entries:');
      retrievalData.vocabulary.slice(0, 3).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.sourceText} → ${entry.targetText}`);
      });
    }
    
    if (retrievalData.examples.length > 0) {
      console.log('\n📝 Top Translation Examples:');
      retrievalData.examples.slice(0, 3).forEach((example, index) => {
        console.log(`${index + 1}. ${example.sourceText} → ${example.correctedText || example.targetText}`);
      });
    }
    
    console.log('\n✅ Unified retrieval test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRetrieval();