import { prisma } from './lib/db';

async function testCorrectionAPI() {
  try {
    console.log('🔍 Testing correction API with learning insights...');

    // First, let's check how many learning insights we currently have
    const initialInsightsCount = await prisma.learningInsight.count();
    console.log(`📊 Initial learning insights count: ${initialInsightsCount}`);

    // Simulate a correction API call
    const response = await fetch('http://localhost:3000/api/correct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceText: "Hello, how are you?",
        originalTranslation: "Sastipe, tumen kada si?",
        correctedTranslation: "Sastipe, tumen kada si? (corrected)",
        context: "Casual greeting",
        domain: "General",
        dialect: "Lovari"
      }),
    });

    const result = await response.json();
    console.log('✅ Correction API response:', result);

    if (!result.success) {
      throw new Error(`Correction API failed: ${result.error}`);
    }

    // Wait a bit for the learning loop to complete (it's fire-and-forget)
    console.log('⏳ Waiting for learning loop to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if a new learning insight was created
    const finalInsightsCount = await prisma.learningInsight.count();
    console.log(`📊 Final learning insights count: ${finalInsightsCount}`);

    // Let's also check for learning insights created in the last 10 seconds
    const recentInsights = await prisma.learningInsight.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 100) // 10 seconds ago
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Recent learning insights count: ${recentInsights.length}`);
    
    if (recentInsights.length > 0) {
      console.log('✅ New learning insight was created!');
      console.log('🧠 Latest learning insight:', recentInsights[0]);
    } else if (finalInsightsCount > initialInsightsCount) {
      console.log('✅ New learning insight was created!');
      
      // Get the latest learning insight
      const latestInsight = await prisma.learningInsight.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      console.log('🧠 Latest learning insight:', latestInsight);
    } else {
      console.log('⚠️ No new learning insight was created.');
    }

    console.log('\n✅ Correction API test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCorrectionAPI();