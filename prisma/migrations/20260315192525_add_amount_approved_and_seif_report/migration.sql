-- AlterTable
ALTER TABLE "SeifApplication" ADD COLUMN     "amountApproved" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "SeifReport" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "amountSpent" DECIMAL(10,2) NOT NULL,
    "underSpendExplanation" TEXT,
    "descriptionActivities" TEXT NOT NULL,
    "finalBudgetFilePath" TEXT NOT NULL,
    "receiptsFilePaths" JSONB NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeifReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeifReport_applicationId_key" ON "SeifReport"("applicationId");

-- AddForeignKey
ALTER TABLE "SeifReport" ADD CONSTRAINT "SeifReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SeifApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
