-- AlterTable
ALTER TABLE "SeifApplication"
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewerComments" TEXT,
ADD COLUMN "approvalConditions" TEXT,
ADD COLUMN "denialReason" TEXT;
