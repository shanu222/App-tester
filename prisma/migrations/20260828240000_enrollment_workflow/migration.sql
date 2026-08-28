-- AlterTable
ALTER TABLE "TestingParticipation" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "TestingParticipation" ADD COLUMN "confirmedByUserId" TEXT;
ALTER TABLE "TestingParticipation" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "TestingParticipation" ADD COLUMN "rejectedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "actions" JSONB;
