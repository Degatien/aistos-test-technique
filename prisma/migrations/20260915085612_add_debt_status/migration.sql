-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "status" "DebtStatus" NOT NULL DEFAULT 'PENDING';
