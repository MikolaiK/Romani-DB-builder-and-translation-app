-- CreateEnum
CREATE TYPE "Dialect" AS ENUM ('Lovari', 'Kelderash', 'Arli');

-- AlterTable
ALTER TABLE "translation_memory" ADD COLUMN     "dialect" "Dialect";
