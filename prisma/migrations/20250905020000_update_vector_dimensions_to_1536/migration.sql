-- Update vector dimensions from 3072 to 1536
-- This migration updates all vector columns to use 1536 dimensions instead of 3072

-- Alter translation_memory table
ALTER TABLE "translation_memory" ALTER COLUMN "embedding" TYPE vector(1536);

-- Alter romani_lexicon table
ALTER TABLE "romani_lexicon" ALTER COLUMN "embedding" TYPE vector(1536);

-- Alter romani_grammar table
ALTER TABLE "romani_grammar" ALTER COLUMN "embedding" TYPE vector(1536);

-- Alter romani_style table
ALTER TABLE "romani_style" ALTER COLUMN "embedding" TYPE vector(1536);

-- Alter knowledge_items table
ALTER TABLE "knowledge_items" ALTER COLUMN "embedding" TYPE vector(1536);
