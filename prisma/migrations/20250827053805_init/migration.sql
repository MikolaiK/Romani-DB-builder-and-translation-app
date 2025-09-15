-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "QualityScore" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "CorrectionType" AS ENUM ('GRAMMAR', 'VOCABULARY', 'STYLE', 'CULTURAL', 'FACTUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrectionSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "translation_memory" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_text" TEXT NOT NULL,
    "target_text" TEXT NOT NULL,
    "corrected_text" TEXT,
    "context" TEXT,
    "domain" TEXT,
    "quality_score" "QualityScore" NOT NULL DEFAULT 'C',
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "source_embedding" vector(3072),
    "target_embedding" vector(3072),

    CONSTRAINT "translation_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrections" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_text" TEXT NOT NULL,
    "corrected_text" TEXT NOT NULL,
    "correction_type" "CorrectionType" NOT NULL,
    "explanation" TEXT,
    "severity" "CorrectionSeverity" NOT NULL,
    "translation_id" TEXT NOT NULL,

    CONSTRAINT "corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" TEXT,
    "translation_id" TEXT NOT NULL,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" vector(3072),
    "quality_score" "QualityScore" NOT NULL DEFAULT 'C',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used" TIMESTAMP(3),

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translation_memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translation_memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
