# Vector Index Creation Guide

This document provides instructions for manually creating vector indexes for the Romani Translation App.

## Background

The application now uses 1536-dimensional embeddings with the Google gemini-embedding-001 model. This dimensionality is within the limits for HNSW indexes in most Postgres/pgvector installations, enabling high-quality vector search.

## Manual Index Creation

Scripts have been provided to create vector indexes. You can run them using one of the following methods:

### Method 1: Using the npm script (recommended)

```bash
npm run db:indexes
```

This will execute the `scripts/run-vector-indexes.sh` script which creates HNSW indexes.

### Method 2: Direct execution of HNSW index creation

```bash
npm run db:hnsw-indexes
```

This runs the TypeScript script that creates HNSW indexes directly.

### Method 3: Direct execution

```bash
./scripts/run-vector-indexes.sh
```

### Method 4: Direct SQL execution

You can also run the SQL commands directly using psql:

```bash
psql "$DATABASE_URL" -f prisma/sql/create_vector_indexes_manual.sql
```

## What the script does

The manual index creation script focuses on creating HNSW indexes for each vector column, which provide better search quality than ivfflat indexes. With 1536 dimensions, these indexes work in most modern pgvector installations.

## Successful Implementation

As of September 6, 2025, all HNSW indexes have been successfully created for the following tables:
- `translation_memory.embedding`
- `romani_lexicon.embedding`
- `romani_grammar.embedding`
- `romani_style.embedding`
- `knowledge_items.embedding`

All indexes are functioning correctly and providing improved search performance.

## Troubleshooting

If index creation fails:

1. Check that your Postgres/pgvector installation supports HNSW indexes
2. Check your Postgres logs for specific error messages
3. You can still use the application without vector indexes, but search performance will be degraded

## Indexes created

The script creates the following HNSW indexes:

- `tm_embedding_hnsw` - HNSW index on translation_memory.embedding
- `romani_lexicon_embedding_hnsw` - HNSW index on romani_lexicon.embedding
- `romani_grammar_embedding_hnsw` - HNSW index on romani_grammar.embedding
- `romani_style_embedding_hnsw` - HNSW index on romani_style.embedding
- `knowledge_items_embedding_hnsw` - HNSW index on knowledge_items.embedding

## Verifying index creation

You can verify which indexes were created by running:

```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexdef LIKE '%vector%' 
AND schemaname = 'public';
