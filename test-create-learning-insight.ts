import { prisma } from './lib/db';
import { generateEmbedding } from './lib/embedding';

async function testCreateLearningInsight() {
  try {
    console.log('🔍 Testing creating learning insight with embedding...');
    
    // Create a learning insight without embedding first
    const learningInsight = await prisma.learningInsight.create({
      data: {
        rule: "Test rule for checking embeddings",
        category: "Test Category",
        confidence: 0.8,
        explanation: "This is a test rule to check if embeddings are saved correctly",
        domain: "General",
        tags: ["test"],
      }
    });
    
    console.log(`✅ Created learning insight: ${learningInsight.id}`);
    
    // Generate embedding for the rule
    const ruleEmbedding = await generateEmbedding(learningInsight.rule);
    console.log(`✅ Generated embedding with length: ${ruleEmbedding.length}`);
    
    // Update the embedding using raw SQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "LearningInsight" SET embedding = $1::vector WHERE id = $2`,
        `[${ruleEmbedding.join(',')}]`,
        learningInsight.id
      );
      console.log('✅ Successfully saved embedding');
    } catch (e) {
      console.error('❌ Failed to store embedding:', e);
    }
    
    // Check if the embedding was saved
    const insights = await prisma.$queryRaw`
      SELECT id, rule, embedding::text
      FROM "LearningInsight"
      WHERE id = ${learningInsight.id}
    ` as any[];
    
    if (insights.length > 0) {
      const insight = insights[0];
      console.log(`📊 Insight with embedding:`);
      console.log(`   Rule: ${insight.rule}`);
      console.log(`   Has embedding: ${!!insight.embedding}`);
      if (insight.embedding) {
        console.log(`   Embedding length: ${insight.embedding.length}`);
      }
    }
    
    console.log('\n✅ Create learning insight test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCreateLearningInsight();