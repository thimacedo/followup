-- AlterEnum
ALTER TYPE "HistoryAction" ADD VALUE 'departamento_alterado';

-- AlterTable
ALTER TABLE "access_codes" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;
