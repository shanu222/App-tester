-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "endsAt" TIMESTAMP(3);

CREATE INDEX "Campaign_endsAt_status_idx" ON "Campaign"("endsAt", "status");

UPDATE "Campaign"
SET "endsAt" = "startedAt" + (("durationDays") * INTERVAL '1 day')
WHERE "published" = true AND "startedAt" IS NOT NULL AND "endsAt" IS NULL;

-- AlterTable
ALTER TABLE "TestingParticipation" ADD COLUMN "source" TEXT;
ALTER TABLE "TestingParticipation" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "TestingParticipation" ADD COLUMN "downloadLinkClickedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CampaignEmailAction" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "playUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEmailAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignEmailAction_tokenHash_key" ON "CampaignEmailAction"("tokenHash");
CREATE INDEX "CampaignEmailAction_campaignId_recipientUserId_idx" ON "CampaignEmailAction"("campaignId", "recipientUserId");
CREATE INDEX "CampaignEmailAction_expiresAt_idx" ON "CampaignEmailAction"("expiresAt");

ALTER TABLE "CampaignEmailAction" ADD CONSTRAINT "CampaignEmailAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignEmailAction" ADD CONSTRAINT "CampaignEmailAction_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CampaignNotificationDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignNotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignNotificationDelivery_campaignId_recipientUserId_type_dayKey_key" ON "CampaignNotificationDelivery"("campaignId", "recipientUserId", "type", "dayKey");
CREATE INDEX "CampaignNotificationDelivery_campaignId_type_status_idx" ON "CampaignNotificationDelivery"("campaignId", "type", "status");
CREATE INDEX "CampaignNotificationDelivery_status_createdAt_idx" ON "CampaignNotificationDelivery"("status", "createdAt");

ALTER TABLE "CampaignNotificationDelivery" ADD CONSTRAINT "CampaignNotificationDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignNotificationDelivery" ADD CONSTRAINT "CampaignNotificationDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
