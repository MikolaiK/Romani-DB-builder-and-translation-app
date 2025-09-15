import { hybridSearch, extractKeywords } from '../lib/retrieval';

async function run() {
  try {
    console.log('Testing full retrieval process...');
    
    // Use the same query as the user
    const query = 'Min mor har ingen mat hemma. Jag och min syster behöver åka till affären för att köpa mat åt vår mamma.';
    
    console.log(`Query: "${query}"`);
    
    // Extract keywords
    const keywords = extractKeywords(query);
    console.log(`Extracted keywords: ${keywords.join(', ')}`);
    
    // Perform hybrid search with a higher maxResults to see all results
    console.log('\n--- Standard Search (no keywords) ---');
    const results = await hybridSearch(query, { maxResults: 100 });
    
    console.log(`\nFound ${results.length} results:`);
    
    // Filter for romani_lexicon results only
    const lexiconResults = results.filter(result => {
      // Determine table based on the logic in translate/route.ts
      if (result.translation.qualityScore === null && result.translation.reviewStatus === null && result.translation.targetText) {
        return true; // romani_lexicon
      }
      return false;
    });
    
    console.log(`\nRomani lexicon results (${lexiconResults.length}):`);
    lexiconResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.translation.sourceText}" -> "${result.translation.targetText}"`);
      console.log(`     Score: ${result.score.toFixed(4)}`);
      console.log(`     Semantic: ${result.semanticScore.toFixed(4)}`);
      console.log(`     Lexical: ${result.lexicalScore.toFixed(4)}`);
    });
    
    // Perform hybrid search with keywords for smarter search
    console.log('\n--- Smart Search (with keywords) ---');
    const smartResults = await hybridSearch(query, { maxResults: 100, keywords });
    
    console.log(`\nFound ${smartResults.length} results with keywords:`);
    
    // Filter for romani_lexicon results only
    const smartLexiconResults = smartResults.filter(result => {
      // Determine table based on the logic in translate/route.ts
      if (result.translation.qualityScore === null && result.translation.reviewStatus === null && result.translation.targetText) {
        return true; // romani_lexicon
      }
      return false;
    });
    
    console.log(`\nRomani lexicon results with keywords (${smartLexiconResults.length}):`);
    smartLexiconResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.translation.sourceText}" -> "${result.translation.targetText}"`);
      console.log(`     Score: ${result.score.toFixed(4)}`);
      console.log(`     Semantic: ${result.semanticScore.toFixed(4)}`);
      console.log(`     Lexical: ${result.lexicalScore.toFixed(4)}`);
    });
    
    // Check if "mor" -> "dej" is in the results
    const morDejResult = smartLexiconResults.find(result =>
      result.translation.sourceText.toLowerCase() === 'mor' &&
      result.translation.targetText.toLowerCase() === 'dej'
    );
    
    if (morDejResult) {
      console.log('\n✓ Found "mor" -> "dej" in smart search results!');
      console.log(`  Position: ${smartLexiconResults.indexOf(morDejResult) + 1}`);
      console.log(`  Score: ${morDejResult.score.toFixed(4)}`);
    } else {
      console.log('\n✗ Did not find "mor" -> "dej" in smart search results');
      // Show all results that contain "mor" or "dej"
      const morResults = smartLexiconResults.filter(result =>
        result.translation.sourceText.toLowerCase().includes('mor') ||
        result.translation.targetText.toLowerCase().includes('dej')
      );
      
      if (morResults.length > 0) {
        console.log('\nResults containing "mor" or "dej":');
        morResults.forEach((result, index) => {
          console.log(`  ${index + 1}. "${result.translation.sourceText}" -> "${result.translation.targetText}"`);
          console.log(`     Score: ${result.score.toFixed(4)}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);