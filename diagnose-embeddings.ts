import { prisma } from './lib/db';

interface LexiconEntry {
  id: string;
  source_text: string;
  target_text: string;
  embedding_str: string;
  embedding_length: number;
}

interface TMEntry {
  id: string;
  source_text: string;
  target_text: string;
  embedding_str: string;
  embedding_length: number;
}

async function diagnoseEmbeddings() {
  console.log('🔍 Diagnosing embedding storage issues...');
  
  // Check romani_lexicon embeddings
  console.log('\n=== Diagnosing Romani Lexicon Embeddings ===');
  const lexiconEntries: LexiconEntry[] = await prisma.$queryRaw`
    SELECT id, source_text, target_text, embedding::text as embedding_str, LENGTH(embedding::text) as embedding_length
    FROM "romani_lexicon"
    WHERE embedding IS NOT NULL
    ORDER BY "created_at" DESC
    LIMIT 3
  `;
  
  console.log(`Found ${lexiconEntries.length} vocabulary entries with embeddings:`);
  
  for (const entry of lexiconEntries) {
    console.log(`\nEntry ID: ${entry.id}`);
    console.log(`Source: ${entry.source_text}`);
    console.log(`Target: ${entry.target_text}`);
    console.log(`Embedding length: ${entry.embedding_length}`);
    console.log(`Embedding string (first 100 chars): ${entry.embedding_str.substring(0, 100)}...`);
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(entry.embedding_str);
      console.log(`Parsed type: ${typeof parsed}`);
      console.log(`Parsed length: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`First few values: [${parsed.slice(0, 5).join(', ')}...]`);
      }
    } catch (e) {
      console.log(`Failed to parse as JSON: ${e}`);
    }
  }
  
  // Check translation_memory embeddings
  console.log('\n=== Diagnosing Translation Memory Embeddings ===');
  const tmEntries: TMEntry[] = await prisma.$queryRaw`
    SELECT id, "source_text", "target_text", embedding::text as embedding_str, LENGTH(embedding::text) as embedding_length
    FROM "translation_memory"
    WHERE embedding IS NOT NULL
    ORDER BY "created_at" DESC
    LIMIT 3
  `;
  
  console.log(`Found ${tmEntries.length} translation memory entries with embeddings:`);
  
  for (const entry of tmEntries) {
    console.log(`\nEntry ID: ${entry.id}`);
    console.log(`Source: ${entry.source_text}`);
    console.log(`Target: ${entry.target_text}`);
    console.log(`Embedding length: ${entry.embedding_length}`);
    console.log(`Embedding string (first 100 chars): ${entry.embedding_str.substring(0, 100)}...`);
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(entry.embedding_str);
      console.log(`Parsed type: ${typeof parsed}`);
      console.log(`Parsed length: ${Array.isArray(parsed) ? parsed.length : 'N/A'}`);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`First few values: [${parsed.slice(0, 5).join(', ')}...]`);
      }
    } catch (e) {
      console.log(`Failed to parse as JSON: ${e}`);
    }
  }
  
  console.log('\n✅ Diagnosis complete!');
}

diagnoseEmbeddings().catch(console.error);
