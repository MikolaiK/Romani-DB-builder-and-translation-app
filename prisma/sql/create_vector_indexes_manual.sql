-- Manual Vector Index Creation Script
-- This script provides direct CREATE INDEX commands for vector columns
-- that were skipped due to dimension limits in the automated scripts.

-- NOTE: These commands may fail if your Postgres/pgvector setup doesn't support
-- high-dimensional indexes. Run each command individually to identify which work.

-- HNSW Indexes (recommended for search quality)
-- These should work with 1536 dimensions which is within the HNSW limits

\echo 'Attempting to create HNSW indexes...'

-- Translation Memory
CREATE INDEX IF NOT EXISTS tm_embedding_hnsw ON translation_memory USING hnsw (embedding vector_cosine_ops);
\echo '✓ Attempted to create tm_embedding_hnsw'

-- Romani Lexicon
CREATE INDEX IF NOT EXISTS romani_lexicon_embedding_hnsw ON romani_lexicon USING hnsw (embedding vector_cosine_ops);
\echo '✓ Attempted to create romani_lexicon_embedding_hnsw'

-- Romani Grammar
CREATE INDEX IF NOT EXISTS romani_grammar_embedding_hnsw ON romani_grammar USING hnsw (embedding vector_cosine_ops);
\echo '✓ Attempted to create romani_grammar_embedding_hnsw'

-- Romani Style
CREATE INDEX IF NOT EXISTS romani_style_embedding_hnsw ON romani_style USING hnsw (embedding vector_cosine_ops);
\echo '✓ Attempted to create romani_style_embedding_hnsw'

-- Knowledge Items
CREATE INDEX IF NOT EXISTS knowledge_items_embedding_hnsw ON knowledge_items USING hnsw (embedding vector_cosine_ops);
\echo '✓ Attempted to create knowledge_items_embedding_hnsw'

-- How to run this script:
-- 1. Save this file as prisma/sql/create_vector_indexes_manual.sql
-- 2. Run with psql:
--    psql "$DATABASE_URL" -f prisma/sql/create_vector_indexes_manual.sql
--
-- Or run individual commands:
--    psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS tm_embedding_hnsw ON translation_memory USING hnsw (embedding vector_cosine_ops);"
--
-- With 1536 dimensions, these HNSW indexes should work in most modern pgvector installations

\echo 'Manual vector index creation script completed.'
\echo 'Check for any error messages above to determine which indexes were created successfully.'
