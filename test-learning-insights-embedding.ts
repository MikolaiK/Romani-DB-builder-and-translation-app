import { prisma } from './lib/db';

async function testLearningInsightsEmbedding() {
  try {
    console.log('🔍 Testing learning insights embedding...');
    
    // Get all learning insights with their embeddings (cast to string)
    const insights = await prisma.$queryRaw`
      SELECT id, rule, category, confidence, explanation, domain, tags, "sourceTranslationMemoryId", "createdAt", "updatedAt", embedding::text
      FROM "LearningInsight"
    `;
    
    console.log(`📊 Learning insights with embeddings:`);
    (insights as any).forEach((insight: any, index: number) => {
      console.log(`${index + 1}. Rule: ${insight.rule.substring(0, 50)}...`);
      console.log(`   Category: ${insight.category}`);
      console.log(`   Confidence: ${insight.confidence}`);
      console.log(`   Source TM ID: ${insight.sourceTranslationMemoryId || 'NULL'}`);
      console.log(`   Domain: ${insight.domain || 'NULL'}`);
      console.log(`   Has embedding: ${!!insight.embedding}`);
      if (insight.embedding) {
        console.log(`   Embedding length: ${insight.embedding.length}`);
      }
      console.log('');
    });
    
    console.log('\n✅ Learning insights embedding test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLearningInsightsEmbedding();