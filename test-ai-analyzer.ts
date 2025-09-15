import { generateLearningInsight } from './lib/ai-analyzer';

async function testAIAnalyzer() {
  try {
    console.log('🔍 Testing AI analyzer service...');

    // Test the generateLearningInsight function
    const insight = await generateLearningInsight(
      "Hello, how are you?",
      "Sastipe, tumen kada si?",
      "Sastipe, tumen kada si? (corrected)",
      "Lovari",
      "General",
      []
    );

    console.log('✅ AI analyzer response:', insight);

    if (insight) {
      console.log('✅ Learning insight generated successfully!');
      console.log('Rule:', insight.rule);
      console.log('Category:', insight.category);
      console.log('Confidence:', insight.confidence);
      console.log('Explanation:', insight.explanation);
    } else {
      console.log('⚠️ No learning insight was generated.');
    }

    console.log('\n✅ AI analyzer test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAIAnalyzer();