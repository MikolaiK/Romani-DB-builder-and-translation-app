import { testEmbedding } from './lib/embedding';

async function main() {
  try {
    await testEmbedding();
    console.log('✅ Embedding test completed successfully');
  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    process.exit(1);
  }
}

main();
