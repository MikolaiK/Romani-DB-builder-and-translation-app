# Verification Plan for Ingestion Pipeline Changes

This document outlines the verification process for the hybrid solution implemented in the ingestion pipeline to prevent vocabulary pairs from being accidentally extracted when uploading parallel sentence data.

## Test Cases

### 1. Parallel Sentences Upload
**Objective**: Verify that uploading parallel sentences only extracts parallelPairs and ignores vocabPairs and grammarChunks.

**Test Data**:
```
Hello! How are you? || Baxt! Sar san?
I'm fine. || Me san baxt.
What is your name? || Tute ko ka navas?
My name is Anna. || Miro nav si Anna.
```

**Expected Results**:
- Only `parallelPairs` should be populated in the response
- `vocabPairs` and `grammarChunks` should be empty arrays

### 2. Vocabulary Upload
**Objective**: Verify that uploading vocabulary only extracts vocabPairs and ignores parallelPairs and grammarChunks.

**Test Data**:
```
Swedish: hej = Romani: baxt
Swedish: god morgon = Romani: baxt din
Swedish: tack = Romani: dajjimos
Swedish: ja = Romani: haan
Swedish: nej = Romani: na
```

**Expected Results**:
- Only `vocabPairs` should be populated in the response
- `parallelPairs` and `grammarChunks` should be empty arrays

### 3. Grammar Upload
**Objective**: Verify that uploading grammar content only extracts grammarChunks and ignores vocabPairs and parallelPairs.

**Test Data**:
```
# Noun Declensions

Singular nouns in Romani typically end in -o or -a. For example:
- "chavo" (boy)
- "chava" (girl)

The definite article is suffixed to the noun:
- "chavo-s" (the boy)
- "chava-s" (the girl)

## Plural Formation

Plural is formed by adding -e to the singular form:
- "chav-e" (boys/girls)
- "chav-e-s" (the boys/girls)
```

**Expected Results**:
- Only `grammarChunks` should be populated in the response
- `vocabPairs` and `parallelPairs` should be empty arrays

## Verification Steps

1. **API Testing**:
   - Use the `/api/ingest/prepare` endpoint with each source type
   - Verify the response contains only the expected data structures
   - Check that the AI prompt is correctly scoped to the source type

2. **UI Testing**:
   - Use the ingestion UI to upload each type of content
   - Select the appropriate source type from the dropdown
   - Verify that only the relevant content is displayed in the preview

3. **Database Verification**:
   - Confirm that content is correctly stored in the appropriate tables:
     - Parallel sentences → `translation_memory`
     - Vocabulary pairs → `romani_lexicon`
     - Grammar chunks → `romani_grammar`

4. **Edge Cases**:
   - Test with mixed content to ensure proper filtering
   - Test with empty or invalid content
   - Test with large files to ensure performance is acceptable

## Success Criteria

- Each source type only extracts the appropriate data structures
- AI token usage is reduced by scoping prompts to specific tasks
- No vocabulary pairs are accidentally extracted from parallel sentence uploads
- The ingestion pipeline maintains its existing functionality for all source types
- Error handling continues to work correctly