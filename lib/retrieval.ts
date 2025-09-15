import { prisma } from './db';
import { generateEmbedding } from './embedding';
import { CONFIG } from './config';
import { TranslationMemory } from '@prisma/client';

export interface SearchResult {
  translation: TranslationMemory;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  exactMatchBoost?: number;
  qualityBoost: number;
  recencyBoost: number;
  correctedBoost?: number;
}

export interface LearningInsightResult {
  insight: {
    id: string;
    rule: string;
    category: string;
    confidence: number;
    explanation: string | null;
    domain: string | null;
    tags: string[];
  };
  score: number;
  semanticScore: number;
}

export interface GrammarResult {
  id: string;
  content: string;
  qualityScore: string | null;
  score: number;
  semanticScore: number;
  lexicalScore: number;
}

export interface LexiconResult {
 id: string;
  sourceText: string;
  targetText: string;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  exactMatchBoost?: number;
}

export interface TranslationExample {
  id: string;
  sourceText: string;
  targetText: string;
  correctedText: string | null;
  context: string | null;
  domain: string | null;
  dialect: string | null;
  score: number;
  semanticScore: number;
  lexicalScore: number;
  qualityBoost: number;
  correctedBoost?: number;
  recencyBoost: number;
}

export interface SearchOptions {
  alpha?: number; // Balance between semantic and lexical (0-1)
  maxResults?: number;
  minScore?: number;
  domain?: string;
  dialect?: 'Lovari' | 'Kelderash' | 'Arli';
  tags?: string[]; // Tags for filtering results
  keywords?: string[]; // Keywords for pre-filtering
}

/**
 * Extract important keywords from a query string
* This function identifies potential vocabulary words that might have translations
 */
export function extractKeywords(query: string): string[] {
  // Split the query into words and remove punctuation
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2); // Filter out short words
  
  // Common Swedish stop words to filter out
  const stopWords = new Set([
    'och', 'eller', 'men', 'för', 'att', 'med', 'till', 'från', 'på', 'i', 'om', 'är', 'har', 'kan', 'ska', 'vill',
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'a', 'an', 'the', 'in', 'on', 'at', 'by',
    'min', 'min', 'mitt', 'mina', 'din', 'ditt', 'dina', 'hans', 'hennes', 'dess', 'vår', 'vårt', 'våra', 'er', 'ert', 'era',
    'jag', 'du', 'han', 'hon', 'den', 'det', 'vi', 'ni', 'de', 'sig', 'mig', 'dig', 'oss', 'er', 'dem', 'min', 'mitt', 'mina'
  ]);
  
  // Filter out stop words and return unique keywords
  return [...new Set(words.filter(word => !stopWords.has(word)))];
}

export async function hybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    alpha = CONFIG.RETRIEVAL.DEFAULT_ALPHA,
    maxResults = CONFIG.RETRIEVAL.MAX_RESULTS,
    minScore = 0.1,
    domain,
    dialect,
    tags,
    keywords
  } = options;

  try {
    console.log(`🔍 Searching for: "${query}" (alpha: ${alpha})`);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    // Generate query embedding for lexicon search (to match how lexicon embeddings were created during ingestion)
    const lexiconQueryText = `Swedish: ${query} ||| Romani:`;
    const lexiconQueryEmbedding = await generateEmbedding(lexiconQueryText);
    // We'll query translation_memory and the new romani_* tables separately and merge results
    const paramsBase = [`[${queryEmbedding.join(',')}]`, query];
    const lexiconParamsBase = [`[${lexiconQueryEmbedding.join(',')}]`, query];

    // translation_memory query (keeps previous scoring)
    const tmQuery = `
      SELECT id, created_at, updated_at, source_text, target_text, corrected_text, context, domain, quality_score, review_status, review_notes, reviewed_at, reviewed_by,
  COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        ( similarity(source_text, $2) + similarity(COALESCE(corrected_text, target_text), $2) + COALESCE(similarity(context, $2), 0) ) / 3 as lexical_score,
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END as quality_boost,
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END as corrected_boost,
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) as recency_boost
      FROM translation_memory
      WHERE review_status = 'APPROVED'
      ${domain && dialect ? 'AND domain = $3 AND dialect = $4::"Dialect"' : ''}
      ${domain && !dialect ? 'AND domain = $3' : ''}
      ${!domain && dialect ? 'AND dialect = $3::"Dialect"' : ''}
  AND (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.1 OR similarity(source_text, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (
  ${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) +
        ${1 - alpha} * (( similarity(source_text, $2) + similarity(COALESCE(corrected_text, target_text), $2) + COALESCE(similarity(context, $2), 0) ) / 3) +
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END +
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END +
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) * 0.1
      ) DESC
      LIMIT ${maxResults}
    `;

    const tmParams = [paramsBase[0], paramsBase[1], ...(domain && dialect ? [domain, dialect] : []), ...(domain && !dialect ? [domain] : []), ...(!domain && dialect ? [dialect] : [])];
  const tmRaw = await prisma.$queryRawUnsafe(tmQuery, ...tmParams) as unknown[];

    // romani_lexicon: embed both source and target against query; treat source_text as primary match
    // Build WHERE conditions for tags and keywords
    const lexiconWhereConditions: string[] = [];
    const lexiconParams: (string | string[] | number[])[] = [lexiconParamsBase[0], lexiconParamsBase[1]]; // Start with embedding and query text
    let lexiconParamIndex = 3; // Next parameter index (1-based for SQL)
    
    // Add dialect condition if specified
    if (dialect) {
      lexiconWhereConditions.push(`dialect = $${lexiconParamIndex}::"Dialect"`);
      lexiconParams.push(dialect);
      lexiconParamIndex++;
    }
    
    // Add tag conditions if specified
    if (tags && tags.length > 0) {
      // Use && operator to check if any of the record's tags match any of the filter tags
      lexiconWhereConditions.push(`tags && $${lexiconParamIndex}::text[]`);
      lexiconParams.push(`{${tags.map(t => `"${t}"`).join(',')}}`); // Format as PostgreSQL array literal
      lexiconParamIndex++;
    }
    
    // Add keyword conditions if specified
    if (keywords && keywords.length > 0) {
      // Create a condition that matches any of the keywords in source_text
      const keywordConditions = keywords.map((_, index) => `source_text = $${lexiconParamIndex + index}`).join(' OR ');
      lexiconWhereConditions.push(`(${keywordConditions})`);
      lexiconParams.push(...keywords);
      lexiconParamIndex += keywords.length;
    }
    
    // Add similarity conditions
    lexiconWhereConditions.push(`(COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(source_text, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})`);
    
    const lexQuery = `
      SELECT id, created_at, updated_at, source_text, target_text, domain, NULL as quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(source_text, $2) as lexical_score,
        CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END as exact_match_boost,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_lexicon
      WHERE ${lexiconWhereConditions.length > 0 ? lexiconWhereConditions.join(' AND ') : 'TRUE'}
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(source_text, $2) + CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END) DESC
      LIMIT ${maxResults}
    `;
  const lexRaw = await prisma.$queryRawUnsafe(lexQuery, ...lexiconParams) as unknown[];

    // romani_grammar
    const gramQuery = `
      SELECT id, created_at, updated_at, content as source_text, NULL as target_text, NULL as corrected_text, NULL as context, NULL as domain, quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, $2) as lexical_score,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_grammar
      WHERE ${dialect ? 'dialect = $3::"Dialect" AND' : ''} (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(content, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(content, $2)) DESC
      LIMIT ${maxResults}
    `;
    const gramParams = dialect ? [paramsBase[0], paramsBase[1], dialect] : [paramsBase[0], paramsBase[1]];
  const gramRaw = await prisma.$queryRawUnsafe(gramQuery, ...gramParams) as unknown[];

    // romani_style
    const styleQuery = `
      SELECT id, created_at, updated_at, content as source_text, NULL as target_text, NULL as corrected_text, NULL as context, NULL as domain, quality_score, NULL as review_status, NULL as review_notes, NULL as reviewed_at, NULL as reviewed_by,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, $2) as lexical_score,
        0 as quality_boost, 0 as corrected_boost, 0 as recency_boost
      FROM romani_style
      WHERE ${dialect ? 'dialect = $3::"Dialect" AND' : ''} (COALESCE(1 - (embedding <=> $1::vector), 0) > 0.05 OR similarity(content, $2) > ${CONFIG.RETRIEVAL.MIN_LEXICAL_SCORE})
      ORDER BY (${alpha} * COALESCE(1 - (embedding <=> $1::vector), 0) + ${1 - alpha} * similarity(content, $2)) DESC
      LIMIT ${maxResults}
    `;
    const styleParams = dialect ? [paramsBase[0], paramsBase[1], dialect] : [paramsBase[0], paramsBase[1]];
  const styleRaw = await prisma.$queryRawUnsafe(styleQuery, ...styleParams) as unknown[];

  const rawResults = [...tmRaw, ...lexRaw, ...gramRaw, ...styleRaw] as unknown[];

    // Transform raw results
    const results: SearchResult[] = rawResults
      .map((r) => {
        const row = r as Record<string, unknown>;
        const semanticScore = parseFloat(String(row['semantic_score'] ?? '0')) || 0;
        const lexicalScore = parseFloat(String(row['lexical_score'] ?? '0')) || 0;
        const exactMatchBoost = parseFloat(String(row['exact_match_boost'] ?? '0')) || 0;
        const qualityBoost = parseFloat(String(row['quality_boost'] ?? '0')) || 0;
        const correctedBoost = parseFloat(String(row['corrected_boost'] ?? '0')) || 0;
        const recencyBoost = parseFloat(String(row['recency_boost'] ?? '0')) || 0;

        const finalScore = alpha * semanticScore + (1 - alpha) * lexicalScore + exactMatchBoost + qualityBoost + correctedBoost + recencyBoost * 0.1;

        const translation = {
          id: String(row['id']),
          createdAt: (row['created_at'] as unknown) || null,
          updatedAt: (row['updated_at'] as unknown) || null,
          sourceText: String(row['source_text'] ?? ''),
          targetText: String(row['target_text'] ?? ''),
          correctedText: row['corrected_text'] as string | null,
          context: row['context'] as string | null,
          domain: row['domain'] as string | null,
          dialect: row['dialect'] as string | null,
          qualityScore: row['quality_score'] as string | null,
          reviewStatus: row['review_status'] as string | null,
          reviewNotes: row['review_notes'] as string | null,
          reviewedAt: row['reviewed_at'] as string | null,
          reviewedBy: row['reviewed_by'] as string | null,
        } as unknown as TranslationMemory;

        return {
          translation,
          score: finalScore,
          semanticScore,
          lexicalScore,
          qualityBoost,
          correctedBoost,
          recencyBoost,
        };
      })
      .filter(result => result.score >= minScore)
      .slice(0, maxResults);

    console.log(`✅ Found ${results.length} results (scores: ${results.map(r => r.score.toFixed(3)).join(', ')})`);
    
    return results;
  } catch (error) {
    console.error('Hybrid search failed:', error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function findSimilarTranslations(sourceText: string, targetText: string): Promise<SearchResult[]> {
  // Search for similar source texts and target texts
  const [sourceResults, targetResults] = await Promise.all([
    hybridSearch(sourceText, { alpha: 0.8, maxResults: 5 }),
    hybridSearch(targetText, { alpha: 0.8, maxResults: 5 })
  ]);

  // Combine and deduplicate results
  const combinedResults = new Map<string, SearchResult>();
  
  [...sourceResults, ...targetResults].forEach(result => {
    const existing = combinedResults.get(result.translation.id);
    if (!existing || result.score > existing.score) {
      combinedResults.set(result.translation.id, result);
    }
  });

  return Array.from(combinedResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.RETRIEVAL.MAX_RESULTS);
}

/**
 * Search for learning insights using vector similarity
 */
export async function searchLearningInsights(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<LearningInsightResult[]> {
  const { maxResults = 7, dialect } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`(source_translation_memory.dialect = $${paramIndex}::"Dialect" OR source_translation_memory.dialect IS NULL)`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        "LearningInsight".id,
        "LearningInsight".rule,
        "LearningInsight".category,
        "LearningInsight".confidence,
        "LearningInsight".explanation,
        "LearningInsight".domain,
        "LearningInsight".tags,
        COALESCE(1 - ("LearningInsight".embedding <=> $1::vector), 0) as semantic_score
      FROM "LearningInsight"
      LEFT JOIN translation_memory source_translation_memory
        ON "LearningInsight"."sourceTranslationMemoryId" = source_translation_memory.id
      ${whereClause}
      -- Note: We're not filtering out insights without embeddings anymore
      -- AND "LearningInsight".embedding IS NOT NULL
      ORDER BY COALESCE(1 - ("LearningInsight".embedding <=> $1::vector), 0) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      insight: {
        id: String(row.id),
        rule: String(row.rule),
        category: String(row.category),
        confidence: parseFloat(String(row.confidence)),
        explanation: row.explanation ? String(row.explanation) : null,
        domain: row.domain ? String(row.domain) : null,
        tags: Array.isArray(row.tags) ? row.tags : []
      },
      score: parseFloat(String(row.semantic_score)),
      semanticScore: parseFloat(String(row.semantic_score))
    }));
  } catch (error) {
    console.error('Learning insights search failed:', error);
    return [];
  }
}

/**
 * Search for grammar rules using vector similarity
 */
export async function searchRomaniGrammar(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<GrammarResult[]> {
  const { maxResults = 7, dialect } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        id,
        content,
        quality_score,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(content, '') as lexical_score
      FROM romani_grammar
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY COALESCE(1 - (embedding <=> $1::vector), 0) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      content: String(row.content),
      qualityScore: row.quality_score ? String(row.quality_score) : null,
      score: parseFloat(String(row.semantic_score)),
      semanticScore: parseFloat(String(row.semantic_score)),
      lexicalScore: parseFloat(String(row.lexical_score))
    }));
  } catch (error) {
    console.error('Romani grammar search failed:', error);
    return [];
  }
}

/**
 * Search for vocabulary pairs using vector similarity
 */
export async function searchRomaniLexicon(
  queryEmbedding: number[],
  sourceText: string,
  options: SearchOptions = {}
): Promise<LexiconResult[]> {
  const { maxResults = 10, dialect, keywords } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = [];
    const params: (string | string[] | number[])[] = [embeddingStr, sourceText];
    let paramIndex = 3; // Start with $3 since $1 is embedding and $2 is sourceText
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    // Add keyword boost conditions if specified
    // We'll use keywords to boost similarity scores rather than filter results
    let keywordBoost = '';
    if (keywords && keywords.length > 0) {
      // Create a boost factor based on keyword matches
      const keywordMatches = keywords.map((keyword, index) =>
        `CASE WHEN source_text ILIKE '%${keyword}%' THEN 0.3 ELSE 0 END`
      ).join(' + ');
      keywordBoost = ` + ${keywordMatches}`;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT
        id,
        source_text,
        target_text,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        similarity(source_text, $2) as lexical_score,
        CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END as exact_match_boost
      FROM romani_lexicon
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY (COALESCE(1 - (embedding <=> $1::vector), 0) + similarity(source_text, $2) + CASE WHEN source_text = $2 THEN 0.5 ELSE 0 END${keywordBoost}) DESC
      LIMIT $${paramIndex}::int
    `;
    
    // Add maxResults parameter at the correct position
    // We need to insert it at the right position in the params array
    // The position should be paramIndex (which is the next available index)
    const paramsWithLimit = [...params];
    paramsWithLimit.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...paramsWithLimit) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      sourceText: String(row.source_text),
      targetText: String(row.target_text),
      score: parseFloat(String(row.semantic_score)) + parseFloat(String(row.lexical_score)) + parseFloat(String(row.exact_match_boost || 0)),
      semanticScore: parseFloat(String(row.semantic_score)),
      lexicalScore: parseFloat(String(row.lexical_score)),
      exactMatchBoost: parseFloat(String(row.exact_match_boost || 0))
    }));
  } catch (error) {
    console.error('Romani lexicon search failed:', error);
    return [];
  }
}

/**
 * Search for translation examples using vector similarity
 */
export async function searchTranslationMemory(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<TranslationExample[]> {
  const { maxResults = 7, dialect, domain } = options;
  
  try {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Build WHERE conditions
    const whereConditions: string[] = ['review_status = \'APPROVED\''];
    const params: (string | string[] | number[])[] = [embeddingStr];
    let paramIndex = 2; // Start with $2 since $1 is the embedding
    
    // Add domain condition if specified
    if (domain) {
      whereConditions.push(`domain = $${paramIndex}`);
      params.push(domain);
      paramIndex++;
    }
    
    // Add dialect condition if specified
    if (dialect) {
      whereConditions.push(`dialect = $${paramIndex}::"Dialect"`);
      params.push(dialect);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    const query = `
      SELECT
        id,
        source_text,
        target_text,
        corrected_text,
        context,
        domain,
        dialect,
        quality_score,
        review_status,
        COALESCE(1 - (embedding <=> $1::vector), 0) as semantic_score,
        (similarity(source_text, '') + similarity(COALESCE(corrected_text, target_text), '') + COALESCE(similarity(context, ''), 0)) / 3 as lexical_score,
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END as quality_boost,
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END as corrected_boost,
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) as recency_boost
      FROM translation_memory
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY (
        COALESCE(1 - (embedding <=> $1::vector), 0) +
        (similarity(source_text, '') + similarity(COALESCE(corrected_text, target_text), '') + COALESCE(similarity(context, ''), 0)) / 3 +
        CASE quality_score WHEN 'A' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.A} WHEN 'B' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.B} WHEN 'C' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.C} WHEN 'D' THEN ${CONFIG.RETRIEVAL.QUALITY_BOOST_MAP.D} ELSE 0 END +
        CASE WHEN corrected_text IS NOT NULL THEN 0.15 ELSE 0 END +
        GREATEST(0, 1 - (EXTRACT(days FROM NOW() - created_at) / ${CONFIG.RETRIEVAL.RECENCY_DECAY_DAYS})) * 0.1
      ) DESC
      LIMIT $${paramIndex}::int
    `;
    
    params.push(maxResults.toString());
    
    const rawResults = await prisma.$queryRawUnsafe(query, ...params) as unknown[];
    
    return (rawResults as Record<string, unknown>[]).map((row) => {
      const semanticScore = parseFloat(String(row.semantic_score)) || 0;
      const lexicalScore = parseFloat(String(row.lexical_score)) || 0;
      const qualityBoost = parseFloat(String(row.quality_boost)) || 0;
      const correctedBoost = parseFloat(String(row.corrected_boost)) || 0;
      const recencyBoost = parseFloat(String(row.recency_boost)) || 0;
      
      const finalScore = semanticScore + lexicalScore + qualityBoost + correctedBoost + recencyBoost * 0.1;
      
      return {
        id: String(row.id),
        sourceText: String(row.source_text),
        targetText: String(row.target_text),
        correctedText: row.corrected_text ? String(row.corrected_text) : null,
        context: row.context ? String(row.context) : null,
        domain: row.domain ? String(row.domain) : null,
        dialect: row.dialect ? String(row.dialect) : null,
        score: finalScore,
        semanticScore,
        lexicalScore,
        qualityBoost,
        correctedBoost,
        recencyBoost
      };
    });
  } catch (error) {
    console.error('Translation memory search failed:', error);
    return [];
  }
}

/**
 * Unified retrieval service that queries all four data sources in parallel
 * and returns structured results for use in the translation prompt
 */
export async function unifiedRetrieval(
  query: string,
  options: SearchOptions = {}
): Promise<{
  learningInsights: LearningInsightResult[];
  grammarRules: GrammarResult[];
  vocabulary: LexiconResult[];
  examples: TranslationExample[];
}> {
  try {
    console.log(`🔍 Performing unified retrieval for: "${query}"`);
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Query all four data sources in parallel
    const [learningInsights, grammarRules, vocabulary, examples] = await Promise.all([
      searchLearningInsights(queryEmbedding, options),
      searchRomaniGrammar(queryEmbedding, options),
      searchRomaniLexicon(queryEmbedding, query, options),
      searchTranslationMemory(queryEmbedding, options)
    ]);
    
    console.log(`✅ Unified retrieval completed:
      - Learning insights: ${learningInsights.length}
      - Grammar rules: ${grammarRules.length}
      - Vocabulary entries: ${vocabulary.length}
      - Translation examples: ${examples.length}`);
    
    return {
      learningInsights,
      grammarRules,
      vocabulary,
      examples
    };
  } catch (error) {
    console.error('Unified retrieval failed:', error);
    throw new Error(`Unified retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
