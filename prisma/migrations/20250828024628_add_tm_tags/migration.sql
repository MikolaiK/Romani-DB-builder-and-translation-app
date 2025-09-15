-- AlterTable
ALTER TABLE "translation_memory" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
