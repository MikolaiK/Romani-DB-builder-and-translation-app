import { prisma } from './lib/db';
import { generateEmbedding } from './lib/embedding';

interface LexiconEntry {
  id: string;
  source_text: string;
  target_text: string;
  embedding: string | null;
  created_at: Date;
}

interface TranslationMemoryEntry {
  id: string;
  source_text: string;
  target_text: string;
  corrected_text: string | null;
  embedding: string | null;
  created_at: Date;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

async function verifyEmbeddings() {
 console.log('🔍 Verifying embedding implementation...');
  
  // Check romani_lexicon (vocabulary pairs)
  console.log('\n=== Checking Romani Lexicon (Vocabulary Pairs) ===');
  const recentLexicon: any[] = await prisma.$queryRaw`
    SELECT id, "source_text", "target_text", embedding::text, "created_at"
    FROM "romani_lexicon"
    ORDER BY "created_at" DESC
    LIMIT 3
  `;
  
  console.log(`Found ${recentLexicon.length} recent vocabulary entries:`);
  
  for (const entry of recentLexicon) {
    console.log(`\nEntry ID: ${entry.id}`);
    console.log(`Source: ${entry.source_text}`);
    console.log(`Target: ${entry.target_text}`);
    console.log(`Created: ${entry.created_at}`);
    
    // Check if embedding exists
    if (entry.embedding) {
      // Properly parse the embedding from PostgreSQL vector format
      const embeddingArray = JSON.parse(entry.embedding);
      console.log(`Embedding dimensions: ${embeddingArray.length}`);
      
      // Verify it's 1536 dimensions
      if (embeddingArray.length === 1536) {
        console.log('✅ Correct dimensionality (1536)');
      } else {
        console.log(`❌ Incorrect dimensionality: ${embeddingArray.length}`);
      }
      
      // Generate the expected combined text
      const expectedCombinedText = `Swedish: ${entry.source_text} ||| Romani: ${entry.target_text}`;
      console.log(`Expected combined text: ${expectedCombinedText}`);
      
      // Generate embedding for the combined text
      try {
        const testEmbedding = await generateEmbedding(expectedCombinedText);
        console.log(`Generated embedding dimensions: ${testEmbedding.length}`);
        
        // Calculate cosine similarity
        const dotProduct = embeddingArray.reduce((sum: number, val: number, i: number) => sum + val * testEmbedding[i], 0);
        const magnitude1 = Math.sqrt(embeddingArray.reduce((sum: number, val: number) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(testEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
        const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
        
        if (cosineSimilarity > 0.99) {
          console.log(`✅ Embeddings match with similarity: ${cosineSimilarity.toFixed(4)}`);
        } else {
          console.log(`❌ Embeddings do not match. Similarity: ${cosineSimilarity.toFixed(4)}`);
          console.log(`  This may indicate the stored embedding was generated with different parameters`);
        }
      } catch (error) {
        console.log(`❌ Failed to generate test embedding: ${error}`);
      }
    } else {
      console.log('❌ No embedding found');
    }
  }
  
  // Check translation_memory (parallel sentences)
  console.log('\n=== Checking Translation Memory (Parallel Sentences) ===');
  const recentTM: any[] = await prisma.$queryRaw`
    SELECT id, "source_text", "target_text", "corrected_text", embedding::text, "created_at"
    FROM "translation_memory"
    ORDER BY "created_at" DESC
    LIMIT 3
  `;
  
  console.log(`Found ${recentTM.length} recent translation memory entries:`);
  
  for (const entry of recentTM) {
    console.log(`\nEntry ID: ${entry.id}`);
    console.log(`Source: ${entry.source_text}`);
    console.log(`Target: ${entry.target_text}`);
    if (entry.corrected_text) {
      console.log(`Corrected: ${entry.corrected_text}`);
    }
    console.log(`Created: ${entry.created_at}`);
    
    // Check if embedding exists
    if (entry.embedding) {
      const embeddingArray = JSON.parse(entry.embedding);
      console.log(`Embedding dimensions: ${embeddingArray.length}`);
      
      // Verify it's 1536 dimensions
      if (embeddingArray.length === 1536) {
        console.log('✅ Correct dimensionality (1536)');
      } else {
        console.log(`❌ Incorrect dimensionality: ${embeddingArray.length}`);
      }
      
      // Generate the expected combined text (using correctedText if available)
      const targetText = entry.corrected_text || entry.target_text;
      const expectedCombinedText = `${entry.source_text}\n${targetText}`;
      console.log(`Expected combined text: ${expectedCombinedText}`);
      
      // Generate embedding for the combined text
      try {
        const testEmbedding = await generateEmbedding(expectedCombinedText);
        console.log(`Generated embedding dimensions: ${testEmbedding.length}`);
        
        // Calculate cosine similarity
        const dotProduct = embeddingArray.reduce((sum: number, val: number, i: number) => sum + val * testEmbedding[i], 0);
        const magnitude1 = Math.sqrt(embeddingArray.reduce((sum: number, val: number) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(testEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
        const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
        
        if (cosineSimilarity > 0.99) {
          console.log(`✅ Embeddings match with similarity: ${cosineSimilarity.toFixed(4)}`);
        } else {
          console.log(`❌ Embeddings do not match. Similarity: ${cosineSimilarity.toFixed(4)}`);
          console.log(`  This may indicate the stored embedding was generated with different parameters`);
        }
      } catch (error) {
        console.log(`❌ Failed to generate test embedding: ${error}`);
      }
    } else {
      console.log('❌ No embedding found');
    }
  }
  
  // Check database schema to confirm single embedding column
  console.log('\n=== Checking Database Schema ===');
  try {
    // Check romani_lexicon columns
    const lexiconColumns: ColumnInfo[] = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'romani_lexicon' AND column_name LIKE '%embedding%'
    `;
    console.log('Romani Lexicon embedding columns:', lexiconColumns);
    
    // Check translation_memory columns
    const tmColumns: ColumnInfo[] = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'translation_memory' AND column_name LIKE '%embedding%'
    `;
    console.log('Translation Memory embedding columns:', tmColumns);
    
    // Verify only single embedding column exists
    const hasSingleEmbeddingColumnLexicon = Array.isArray(lexiconColumns) && 
      lexiconColumns.length === 1 && 
      lexiconColumns[0].column_name === 'embedding';
      
    const hasSingleEmbeddingColumnTM = Array.isArray(tmColumns) && 
      tmColumns.length === 1 && 
      tmColumns[0].column_name === 'embedding';
    
    if (hasSingleEmbeddingColumnLexicon && hasSingleEmbeddingColumnTM) {
      console.log('✅ Database schema correctly uses single embedding columns');
    } else {
      console.log('❌ Database schema may still have separate embedding columns');
    }
  } catch (error) {
    console.log(`❌ Failed to check database schema: ${error}`);
  }
  
 console.log('\n✅ Verification complete!');
}

verifyEmbeddings().catch(console.error);
