-- AlterTable User
ALTER TABLE "User" ADD COLUMN "github" TEXT;
ALTER TABLE "User" ADD COLUMN "linkedin" TEXT;
ALTER TABLE "User" ADD COLUMN "website" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "developerType" TEXT;
ALTER TABLE "User" ADD COLUMN "yearsExperience" INTEGER;
ALTER TABLE "User" ADD COLUMN "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "technologies" TEXT;
ALTER TABLE "User" ADD COLUMN "testingGmail" TEXT;
ALTER TABLE "User" ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- AlterTable Campaign
ALTER TABLE "Campaign" ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "Campaign" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Campaign" ADD COLUMN "description" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "testingInstructions" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "reciprocalOpen" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'GMAIL_CONFIRMED', 'ACCESS_PROCESSING', 'ADDED', 'INVITATION_READY', 'OPTED_IN', 'ACTIVITY_DETECTED', 'FEEDBACK_RECEIVED', 'COMPLETED', 'DECLINED', 'MANUAL_REQUIRED', 'FAILED');

CREATE TYPE "ReciprocalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "TestingParticipation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "testerUserId" TEXT NOT NULL,
    "testerCampaignId" TEXT,
    "gmail" TEXT,
    "consentAt" TIMESTAMP(3),
    "status" "ParticipationStatus" NOT NULL DEFAULT 'REQUESTED',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestingParticipation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReciprocalTest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "requesterAppId" TEXT,
    "targetCampaignId" TEXT,
    "status" "ReciprocalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReciprocalTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeveloperReport" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetId" TEXT,
    "campaignId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeveloperBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestingParticipation_campaignId_testerUserId_key" ON "TestingParticipation"("campaignId", "testerUserId");
CREATE INDEX "TestingParticipation_ownerUserId_idx" ON "TestingParticipation"("ownerUserId");
CREATE INDEX "TestingParticipation_testerUserId_idx" ON "TestingParticipation"("testerUserId");
CREATE INDEX "TestingParticipation_status_idx" ON "TestingParticipation"("status");
CREATE INDEX "ReciprocalTest_requesterId_idx" ON "ReciprocalTest"("requesterId");
CREATE INDEX "ReciprocalTest_targetId_idx" ON "ReciprocalTest"("targetId");
CREATE INDEX "ReciprocalTest_status_idx" ON "ReciprocalTest"("status");
CREATE INDEX "DeveloperReport_authorId_idx" ON "DeveloperReport"("authorId");
CREATE INDEX "DeveloperReport_targetId_idx" ON "DeveloperReport"("targetId");
CREATE INDEX "DeveloperReport_status_idx" ON "DeveloperReport"("status");
CREATE UNIQUE INDEX "DeveloperBlock_blockerId_blockedId_key" ON "DeveloperBlock"("blockerId", "blockedId");
CREATE INDEX "DeveloperBlock_blockerId_idx" ON "DeveloperBlock"("blockerId");

ALTER TABLE "TestingParticipation" ADD CONSTRAINT "TestingParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestingParticipation" ADD CONSTRAINT "TestingParticipation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestingParticipation" ADD CONSTRAINT "TestingParticipation_testerUserId_fkey" FOREIGN KEY ("testerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReciprocalTest" ADD CONSTRAINT "ReciprocalTest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReciprocalTest" ADD CONSTRAINT "ReciprocalTest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeveloperReport" ADD CONSTRAINT "DeveloperReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeveloperReport" ADD CONSTRAINT "DeveloperReport_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeveloperBlock" ADD CONSTRAINT "DeveloperBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Campaign_published_status_idx" ON "Campaign"("published", "status");

CREATE TABLE "DeveloperMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeveloperMessage_senderId_idx" ON "DeveloperMessage"("senderId");
CREATE INDEX "DeveloperMessage_recipientId_idx" ON "DeveloperMessage"("recipientId");
CREATE INDEX "DeveloperMessage_createdAt_idx" ON "DeveloperMessage"("createdAt");

ALTER TABLE "DeveloperMessage" ADD CONSTRAINT "DeveloperMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeveloperMessage" ADD CONSTRAINT "DeveloperMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
