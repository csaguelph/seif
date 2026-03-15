-- AlterTable
ALTER TABLE "SeifApplication"
ADD COLUMN "reviewedById" TEXT;

-- AddForeignKey
ALTER TABLE "SeifApplication"
ADD CONSTRAINT "SeifApplication_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
