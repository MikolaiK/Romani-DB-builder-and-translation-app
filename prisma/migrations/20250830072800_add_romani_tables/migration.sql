-- CreateTable
CREATE TABLE "romani_lexicon" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_text" TEXT NOT NULL,
    "target_text" TEXT NOT NULL,
    "dialect" "Dialect",
    "domain" TEXT,
    "provenance" JSONB,
    "source_embedding" vector(3072),
    "target_embedding" vector(3072),
    "quality_score" "QualityScore" NOT NULL DEFAULT 'C',
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "romani_lexicon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "romani_grammar" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "document_id" TEXT,
    "filename" TEXT,
    "chunk_index" INTEGER,
    "content" TEXT NOT NULL,
    "dialect" "Dialect",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provenance" JSONB,
    "embedding" vector(3072),
    "quality_score" "QualityScore" NOT NULL DEFAULT 'C',

    CONSTRAINT "romani_grammar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "romani_style" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "dialect" "Dialect",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "provenance" JSONB,
    "embedding" vector(3072),
    "quality_score" "QualityScore" NOT NULL DEFAULT 'C',

    CONSTRAINT "romani_style_pkey" PRIMARY KEY ("id")
);
