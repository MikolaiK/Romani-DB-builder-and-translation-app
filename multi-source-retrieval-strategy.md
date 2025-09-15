# Multi-Source Retrieval and Structured Prompting Strategy

## Current State Analysis

### What We Have:
1. **Four Key Data Sources**:
   - `TranslationMemory` - Translation examples with corrections
   - `RomaniLexicon` - Vocabulary pairs
   - `RomaniGrammar` - Grammar rules
   - `LearningInsight` - Learned insights from corrections (newly implemented)

2. **Existing Retrieval System**:
   - `hybridSearch()` function in `lib/retrieval.ts` that queries multiple sources
   - Currently queries: translation_memory, romani_lexicon, romani_grammar, romani_style
   - Does NOT currently query the new LearningInsight table
   - Uses a combined scoring approach with semantic and lexical similarity

3. **Current Translation Process**:
   - API endpoint at `app/api/translate/route.ts`
   - Uses existing hybrid search to get examples
   - Builds a simple prompt with examples in `lib/ai.ts`
   - Sends prompt to Gemini API

### What's Missing:
1. **Dedicated LearningInsight Query**:
   - No specific function to query LearningInsight table
   - LearningInsights are not being used in the translation process

2. **Structured Prompt Format**:
   - Current prompt is simple and doesn't differentiate between types of information
   - No clear hierarchy or weighting of different information types

3. **Unified Retrieval Interface**:
   - Current system combines results from different sources but doesn't separate them
   - Need a function that returns structured results by source type

## Implementation Plan

### Step 1: Create Unified Retrieval Service

**Objective**: Create a new function `getComprehensiveContext()` that queries all four sources separately and returns structured results.

**Key Features**:
1. **Single Embedding Generation**: Generate embedding once for efficiency
2. **Parallel Queries**: Query all four tables simultaneously for performance
3. **Structured Results**: Return results organized by source type

**Implementation Details**:
```typescript
// In lib/retrieval.ts
export async function getComprehensiveContext(
  sourceText: string,
  options: SearchOptions = {}
): Promise<{
  insights: LearningInsightResult[];
  grammarRules: GrammarResult[];
  lexicon: LexiconResult[];
  examples: TranslationExample[];
}> {
  // Generate embedding once
  const queryEmbedding = await generateEmbedding(sourceText);
  
  // Execute all queries in parallel
  const [insights, grammarRules, lexicon, examples] = await Promise.all([
    searchLearningInsights(queryEmbedding, options),
    searchRomaniGrammar(queryEmbedding, options),
    searchRomaniLexicon(queryEmbedding, sourceText, options),
    searchTranslationMemory(queryEmbedding, options)
  ]);
  
  return { insights, grammarRules, lexicon, examples };
}
```

### Step 2: Implement Individual Search Functions

**LearningInsight Search**:
- Query LearningInsight table with vector similarity
- Return top_k=7 most relevant insights
- Include rule, category, confidence, explanation

**RomaniGrammar Search**:
- Query RomaniGrammar table with vector similarity
- Return top_k=7 most relevant grammar rules
- Include content, quality score

**RomaniLexicon Search**:
- Query RomaniLexicon table with vector similarity
- Return top_k=10 most relevant vocabulary pairs
- Include source_text, target_text

**TranslationMemory Search**:
- Query TranslationMemory table with vector similarity
- Return top_k=7 most relevant examples
- Include source_text, target_text/corrected_text

### Step 3: Create Structured Prompt Template

**Objective**: Create a detailed prompt with clear sections and hierarchy.

**Template Structure**:
```
You are an expert translator from Swedish to Romani (Lovari). Your mission is to produce a correct and idiomatic translation. Follow the instructions below meticulously.

### TASK
Translate the following Swedish text:
"{source_text}"

---

### INSTRUCTIONS (Highest Priority)

**1. STRICT GRAMMAR RULES (Must be followed):**
Based on the source text, apply the following grammatical principles for Lovari:
- {relevant_grammar_rule_1}
- {relevant_grammar_rule_2}
...

**2. MANDATORY VOCABULARY (Use these words):**
For words present in the source text, you must use the following specific Romani translations:
- Swedish: "{swedish_word_1}" -> Romani: "{romani_word_1}"
- Swedish: "{swedish_word_2}" -> Romani: "{romani_word_2}"
...

**3. GUIDING PRINCIPLES & CORRECTIONS (Learned from past mistakes):**
Take into account the following insights learned from previous expert corrections:
- {relevant_learning_insight_1}
- {relevant_learning_insight_2}
...

---

### CONTEXTUAL EXAMPLES (For style and tone)

Here are some examples of similar sentences that have been translated previously:
- Swedish: "{example_source_1}" -> Romani: "{example_target_1}"
- Swedish: "{example_source_2}" -> Romani: "{example_target_2}"
...

---

### YOUR TRANSLATION
Respond ONLY with the final Romani translation, without any extra text or explanations.
```

### Step 4: Upgrade Translation API Endpoint

**Objective**: Modify `app/api/translate/route.ts` to use the new retrieval service.

**Key Changes**:
1. Replace `hybridSearch()` with `getComprehensiveContext()`
2. Build structured prompt using new template
3. Send single, comprehensive prompt to AI
4. Maintain debug information for frontend

### Step 5: Testing and Verification

**Test Cases**:
1. Verify all four sources are being queried
2. Check that results are properly structured
3. Confirm structured prompt is generated correctly
4. Validate translation quality improvements
5. Ensure performance is acceptable (parallel queries)

## Technical Considerations

### Performance Optimization
- Use parallel queries to minimize database round trips
- Limit results appropriately (top_k values as specified)
- Single embedding generation to reduce API calls

### Error Handling
- Graceful degradation if any source fails
- Fallback to existing system if new system fails
- Proper logging for debugging

### Backward Compatibility
- Maintain existing API response format
- Preserve debug information for frontend
- Ensure existing functionality continues to work

## Implementation Sequence

1. **Create individual search functions** for each data source
2. **Implement unified retrieval service** (`getComprehensiveContext`)
3. **Create structured prompt builder** function
4. **Upgrade translation API endpoint**
5. **Add comprehensive testing**
6. **Verify performance and quality improvements**

## Expected Benefits

1. **Improved Translation Quality**: More structured guidance to AI
2. **Better Utilization of Knowledge**: All four sources used effectively
3. **Reduced API Calls**: Single comprehensive prompt instead of multiple interactions
4. **Enhanced Learning**: LearningInsights now actively used in translation process
5. **Clearer Separation of Concerns**: Different types of information clearly categorized