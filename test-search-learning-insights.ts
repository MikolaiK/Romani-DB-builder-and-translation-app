import { searchLearningInsights } from './lib/retrieval';
import { generateEmbedding } from './lib/embedding';

async function testSearchLearningInsights() {
  try {
    console.log('🔍 Testing searchLearningInsights function...');
    
    // Generate a test embedding
    const query = "Hello, how are you?";
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for learning insights
    const insights = await searchLearningInsights(queryEmbedding, { maxResults: 5 });
    
    console.log(`📊 Found ${insights.length} learning insights:`);
    insights.forEach((insight, index) => {
      console.log(`${index + 1}. Rule: ${insight.insight.rule.substring(0, 50)}...`);
      console.log(`   Category: ${insight.insight.category}`);
      console.log(`   Confidence: ${insight.insight.confidence}`);
      console.log(`   Score: ${insight.score}`);
      console.log('');
    });
    
    console.log('\n✅ Search learning insights test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSearchLearningInsights();