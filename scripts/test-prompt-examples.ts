import { hybridSearch, extractKeywords } from '../lib/retrieval';
import { buildTranslationPrompt } from '../lib/ai';

async function run() {
  try {
    console.log('Testing prompt examples selection...');
    
    // Use the same query as the user
    const query = 'Min mor har ingen mat hemma. Jag och min syster behöver åka till affären för att köpa mat åt vår mamma.';
    const dialect = 'Lovari';
    
    console.log(`Query: "${query}"`);
    console.log(`Dialect: ${dialect}`);
    
    // Extract keywords
    const keywords = extractKeywords(query);
    console.log(`Extracted keywords: ${keywords.join(', ')}`);
    
    // Perform hybrid search with keywords for smarter search
    const smartResults = await hybridSearch(query, { maxResults: 100, keywords, dialect });
    
    console.log(`\nFound ${smartResults.length} results with keywords:`);
    
    // Filter for romani_lexicon results only
    const lexiconResults = smartResults.filter(result => {
      // Determine table based on the logic in translate/route.ts
      if (result.translation.qualityScore === null && result.translation.reviewStatus === null && result.translation.targetText) {
        return true; // romani_lexicon
      }
      return false;
    });
    
    console.log(`\nRomani lexicon results with keywords (${lexiconResults.length}):`);
    lexiconResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.translation.sourceText}" -> "${result.translation.targetText}"`);
      console.log(`     Score: ${result.score.toFixed(4)}`);
      console.log(`     Semantic: ${result.semanticScore.toFixed(4)}`);
      console.log(`     Lexical: ${result.lexicalScore.toFixed(4)}`);
    });
    
    // Prepare examples as done in the translation API
    const examples = smartResults.map((r) => ({
      sourceText: r.translation.sourceText,
      targetText: r.translation.correctedText || r.translation.targetText,
      context: r.translation.context || null,
    }));
    
    console.log(`\nTotal examples prepared: ${examples.length}`);
    
    // Show the first 5 examples (what would be used in the prompt)
    console.log('\nFirst 12 examples (what would be used in prompt):');
    const promptExamples = examples.slice(0, 12);
    promptExamples.forEach((example, index) => {
      console.log(`  ${index + 1}. "${example.sourceText}" -> "${example.targetText}"`);
    });
    
    // Check if "mor" -> "dej" is in the examples
    const morDejExample = examples.find(example =>
      example.sourceText.toLowerCase() === 'mor' &&
      example.targetText.toLowerCase() === 'dej'
    );
    
    if (morDejExample) {
      const position = examples.indexOf(morDejExample) + 1;
      console.log(`\n✓ Found "mor" -> "dej" in examples at position ${position}!`);
      
      // Check if it's in the first 12 examples used in the prompt
      if (position <= 12) {
        console.log('✓ "mor" -> "dej" will be included in the prompt (within first 12 examples)');
      } else {
        console.log(`✗ "mor" -> "dej" will NOT be included in the prompt (beyond first 12 examples, at position ${position})`);
      }
    } else {
      console.log('\n✗ Did not find "mor" -> "dej" in examples');
    }
    
    // Build the actual prompt to see what's being sent to the AI
    const prompt = buildTranslationPrompt(query, undefined, undefined, dialect, undefined, promptExamples);
    console.log('\n--- Prompt sent to AI ---');
    console.log(prompt);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);