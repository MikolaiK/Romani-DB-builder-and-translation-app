import { prisma } from './lib/db';

interface LexiconEntry {
  id: string;
  embedding: string;
}

interface TMEntry {
  id: string;
  embedding: string;
}

async function fixEmbeddings() {
  console.log('🔧 Fixing stored embeddings...');
  
  // Fix romani_lexicon embeddings
  console.log('\n=== Fixing Romani Lexicon Embeddings ===');
  const lexiconEntries: LexiconEntry[] = await prisma.$queryRaw`
    SELECT id, embedding::text
    FROM "romani_lexicon"
    WHERE embedding IS NOT NULL
  `;
  
  console.log(`Found ${lexiconEntries.length} vocabulary entries with embeddings`);
  
  let fixedLexicon = 0;
  for (const entry of lexiconEntries) {
    try {
      // Parse the stored string as JSON array
      const embeddingArray = JSON.parse(entry.embedding);
      
      // Check if it's already in the correct format (1536 dimensions)
      if (Array.isArray(embeddingArray) && embeddingArray.length === 1536) {
        // Convert to proper vector format - needs to be a PostgreSQL array literal with square brackets
        const vectorString = `[${embeddingArray.join(',')}]`;
        await prisma.$executeRawUnsafe(`
          UPDATE "romani_lexicon" 
          SET embedding = $1::vector 
          WHERE id = $2
        `, vectorString, entry.id);
        fixedLexicon++;
      } else {
        console.log(`Skipping entry ${entry.id}: incorrect dimensions (${embeddingArray.length})`);
      }
    } catch (error) {
      console.log(`Failed to fix entry ${entry.id}:`, error);
    }
  }
  
  console.log(`Fixed ${fixedLexicon} romani_lexicon entries`);
  
  // Fix translation_memory embeddings
  console.log('\n=== Fixing Translation Memory Embeddings ===');
  const tmEntries: TMEntry[] = await prisma.$queryRaw`
    SELECT id, embedding::text
    FROM "translation_memory"
    WHERE embedding IS NOT NULL
  `;
  
  console.log(`Found ${tmEntries.length} translation memory entries with embeddings`);
  
  let fixedTM = 0;
  for (const entry of tmEntries) {
    try {
      // Parse the stored string as JSON array
      const embeddingArray = JSON.parse(entry.embedding);
      
      // Check if it's already in the correct format (1536 dimensions)
      if (Array.isArray(embeddingArray) && embeddingArray.length === 1536) {
        // Convert to proper vector format - needs to be a PostgreSQL array literal with square brackets
        const vectorString = `[${embeddingArray.join(',')}]`;
        await prisma.$executeRawUnsafe(`
          UPDATE "translation_memory" 
          SET embedding = $1::vector 
          WHERE id = $2
        `, vectorString, entry.id);
        fixedTM++;
      } else {
        console.log(`Skipping entry ${entry.id}: incorrect dimensions (${embeddingArray.length})`);
      }
    } catch (error) {
      console.log(`Failed to fix entry ${entry.id}:`, error);
    }
  }
  
  console.log(`Fixed ${fixedTM} translation_memory entries`);
  
  console.log('\n✅ Embedding fix complete!');
}

fixEmbeddings().catch(console.error);
