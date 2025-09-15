-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionItemStatus" AS ENUM ('INSERTED', 'FAILED');

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "filename" TEXT,
    "dialect" "Dialect",
    "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_records" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "job_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "IngestionItemStatus" NOT NULL DEFAULT 'INSERTED',
    "error_message" TEXT,
    "preview" TEXT,

    CONSTRAINT "ingestion_records_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ingestion_records" ADD CONSTRAINT "ingestion_records_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
