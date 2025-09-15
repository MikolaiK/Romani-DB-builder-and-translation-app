# Resource Ingestion Templates

This document provides templates and guidelines for formatting resources to be ingested into the Romani Translation App database. The ingestion pipeline supports three main types of content: grammar rules, vocabulary pairs, and parallel sentences.

## Table of Contents
- [Grammar Rules](#grammar-rules)
- [Vocabulary Pairs](#vocabulary-pairs)
- [Parallel Sentences](#parallel-sentences)
- [Ingestion Process](#ingestion-process)

## Grammar Rules

Grammar rules should be formatted as plain text with clear section breaks. The system will automatically chunk these into appropriate sizes for embedding.

### Format Guidelines
- Use double newlines (`\n\n`) or markdown-style headers to separate sections
- Keep individual chunks between 500-2000 characters
- Focus on one grammatical concept per section

### Template
```
# [Grammar Topic]

[Explanation of the grammatical concept with examples]

## [Sub-topic or Exception]

[Detailed explanation with examples]

# [Next Grammar Topic]

[Continue with next concept...]
```

### Example
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

# Verb Conjugation

Present tense verbs are formed by removing the infinitive ending -n and adding personal endings:
- "kher-n" (to be) → "kher-am" (I am)
- "jav-n" (to go) → "jav-as" (you go)
```

## Vocabulary Pairs

Vocabulary pairs can be formatted in two ways: CSV-style or explicit format. Each line should contain one Swedish word or phrase and its Romani equivalent.

### Format Guidelines
- One pair per line
- Keep entries concise but meaningful
- Use consistent formatting

### CSV Template
```
[swedish],[romani]
[swedish],[romani]
[swedish],[romani]
```

### Explicit Template
```
Swedish: [swedish] = Romani: [romani]
Swedish: [swedish] = Romani: [romani]
Swedish: [swedish] = Romani: [romani]
```

### Examples

CSV format:
```
hello,baxt
good morning,baxt din
thank you,dajjimos
yes,haan
no,na
```

Explicit format:
```
Swedish: hej = Romani: baxt
Swedish: god morgon = Romani: baxt din
Swedish: tack = Romani: dajjimos
Swedish: ja = Romani: haan
Swedish: nej = Romani: na
```

## Parallel Sentences

Parallel sentences are pairs of sentences in Swedish and Romani that convey the same meaning. These are used to train the translation model and improve context-aware translations.

### Format Guidelines
- One sentence pair per line
- Use `||` or tab character to separate Swedish and Romani sentences
- Keep sentences relatively short and grammatically correct

### Template with || separator
```
[swedish sentence] || [romani sentence]
[swedish sentence] || [romani sentence]
[swedish sentence] || [romani sentence]
```

### Template with tab separator
```
[swedish sentence]	[romani sentence]
[swedish sentence]	[romani sentence]
[swedish sentence]	[romani sentence]
```

### Examples

With || separator:
```
Hello! How are you? || Baxt! Sar san?
I'm fine. || Me san baxt.
What is your name? || Tute ko ka navas?
My name is Anna. || Miro nav si Anna.
```

With tab separator:
```
Hello! How are you?	Baxt! Sar san?
I'm fine.	Me san baxt.
What is your name?	Tute ko ka navas?
My name is Anna.	Miro nav si Anna.
```

## Ingestion Process

### Method 1: Direct API Call
Send a POST request to `/api/ingest/upload` with the following JSON payload:

```json
{
  "rawText": "[your formatted content here]",
  "sourceType": "grammar|vocab|parallel|raw",
  "dialect": "Lovari|Kelderash|Arli",
  "filename": "optional filename"
}
```

### Method 2: Two-Step Process (Recommended for review)
1. **Prepare**: POST to `/api/ingest/prepare` with your content to see how it will be parsed
2. **Review**: Check the parsed results in the preview
3. **Commit**: POST to `/api/ingest/commit` with the prepared payload

### Ingestion Options
- **sourceType**: Specify the type of content being ingested
  - `grammar`: For grammar rules and explanations
  - `vocab`: For vocabulary pairs
  - `parallel`: For sentence pairs
  - `raw`: For unstructured text that will be chunked
- **dialect**: Optional specification of Romani dialect
  - `Lovari`
  - `Kelderash`
  - `Arli`
- **filename**: Optional name for tracking purposes
- **domain**: Optional categorization (e.g., "medical", "legal", "casual")
- **tags**: Optional comma-separated tags for filtering

### Best Practices
1. **Consistency**: Use consistent formatting throughout your document
2. **Quality**: Ensure translations are accurate before ingestion
3. **Size**: Keep files reasonably sized for easier processing (under 10MB recommended)
4. **Validation**: Review parsed content in the preview step before committing
5. **Metadata**: Include relevant metadata like dialect and domain for better search results