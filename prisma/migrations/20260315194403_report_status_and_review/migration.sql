-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'COMPLETE', 'PENDING_FUNDS_RETURN', 'FUNDS_RETURNED');

-- AlterTable
ALTER TABLE "SeifReport" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "reviewerNotes" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED';

-- AddForeignKey
ALTER TABLE "SeifReport" ADD CONSTRAINT "SeifReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
