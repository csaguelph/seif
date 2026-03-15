-- AddForeignKey
ALTER TABLE "SeifReport" ADD CONSTRAINT "SeifReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
