import { prisma } from './lib/db';

async function testLearningInsights() {
  try {
    console.log('🔍 Testing learning insights retrieval...');

    // Check how many learning insights we have in the database
    const insightsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "LearningInsight"`;
    console.log(`📊 Total learning insights in database: ${(insightsCount as any)[0].count}`);

    // Get all learning insights (excluding the embedding column)
    const insights = await prisma.$queryRaw`SELECT id, rule, category, confidence, explanation, domain, tags, "sourceTranslationMemoryId", "createdAt", "updatedAt" FROM "LearningInsight"`;
    
    console.log(`📊 Learning insights:`);
    (insights as any).forEach((insight: any, index: number) => {
      console.log(`${index + 1}. Rule: ${insight.rule.substring(0, 50)}...`);
      console.log(`   Category: ${insight.category}`);
      console.log(`   Confidence: ${insight.confidence}`);
      console.log(`   Source TM ID: ${insight.sourceTranslationMemoryId || 'NULL'}`);
      console.log(`   Domain: ${insight.domain || 'NULL'}`);
      console.log('');
    });

    console.log('\n✅ Learning insights test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLearningInsights();