-- Migration: Unify embeddings into single `embedding` column and add `tags` to romani_lexicon
-- This migration is idempotent where possible; it will add the new column if missing and drop old columns if present.

BEGIN;

-- translation_memory: add embedding column if not exists
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='translation_memory' AND column_name='embedding') THEN
        ALTER TABLE translation_memory ADD COLUMN embedding vector(3072);
    END IF;
END $$;

-- romani_lexicon: add embedding and tags columns if not exists
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_lexicon' AND column_name='embedding') THEN
        ALTER TABLE romani_lexicon ADD COLUMN embedding vector(3072);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_lexicon' AND column_name='tags') THEN
        ALTER TABLE romani_lexicon ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];
    END IF;
END $$;

-- romani_grammar/style/knowledge_items: ensure embedding column exists
DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_grammar' AND column_name='embedding') THEN
        ALTER TABLE romani_grammar ADD COLUMN embedding vector(3072);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_style' AND column_name='embedding') THEN
        ALTER TABLE romani_style ADD COLUMN embedding vector(3072);
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='knowledge_items' AND column_name='embedding') THEN
        ALTER TABLE knowledge_items ADD COLUMN embedding vector(3072);
    END IF;
END $$;

-- Optionally drop old columns if they exist (source_embedding, target_embedding)
DO $$ BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='translation_memory' AND column_name='source_embedding') THEN
        ALTER TABLE translation_memory DROP COLUMN source_embedding;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='translation_memory' AND column_name='target_embedding') THEN
        ALTER TABLE translation_memory DROP COLUMN target_embedding;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_lexicon' AND column_name='source_embedding') THEN
        ALTER TABLE romani_lexicon DROP COLUMN source_embedding;
    END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='romani_lexicon' AND column_name='target_embedding') THEN
        ALTER TABLE romani_lexicon DROP COLUMN target_embedding;
    END IF;
END $$;

-- Create vector indexes for HNSW (if pgvector and ivfflat/hnsw extension present)
-- These statements are safe if the index already exists
-- NOTE: Vector indexes (HNSW/ivfflat) are created by `scripts/init-db.ts` at runtime to avoid
-- shadow-db validation issues on some environments when using high-dimension vectors.
-- GIN index for romani_lexicon.tags for fast tag filtering
CREATE INDEX IF NOT EXISTS romani_lexicon_tags_gin ON romani_lexicon USING GIN (tags);

COMMIT;
