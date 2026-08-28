-- CreateEnum
CREATE TYPE "ManagedPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManagedPaymentProvider" AS ENUM ('MANUAL', 'STUB');

-- CreateEnum
CREATE TYPE "ManagedCampaignStatus" AS ENUM ('AWAITING_PAYMENT', 'DRAFT', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ManagedReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'COMPLETION');

-- CreateEnum
CREATE TYPE "ManagedConsentStatus" AS ENUM ('PENDING', 'CONSENTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ManagedAssignmentStatus" AS ENUM ('AVAILABLE', 'INVITED', 'EMAIL_SENT', 'EMAIL_OPENED', 'GROUP_JOINED', 'OPTED_IN', 'TESTING', 'CONFIRMATION_PENDING', 'CONFIRMED', 'COMPLETED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ManagedInvitationStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ManagedOptInStatus" AS ENUM ('NOT_STARTED', 'JOINED');

-- CreateEnum
CREATE TYPE "ManagedConfirmationStatus" AS ENUM ('NOT_CONFIRMED', 'CONFIRMED');

-- CreateTable
CREATE TABLE "ManagedTestingPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "testerCount" INTEGER NOT NULL,
    "amountPkr" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "contactOnly" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedTestingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedTestingPayment" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "amountPkr" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "provider" "ManagedPaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "status" "ManagedPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionReference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedTestingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedTestingCampaign" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT,
    "paymentId" TEXT NOT NULL,
    "testingType" "TestingType" NOT NULL DEFAULT 'CLOSED',
    "testerTarget" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 14,
    "testingUrl" TEXT,
    "testingInstructions" TEXT,
    "status" "ManagedCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reportEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reportFrequency" "ManagedReportFrequency" NOT NULL DEFAULT 'DAILY',
    "reportTime" TEXT NOT NULL DEFAULT '16:00',
    "reportTimezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "reportWeekday" INTEGER NOT NULL DEFAULT 1,
    "whatsappNumber" TEXT,
    "whatsappVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastReportOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedTestingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedTester" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleAccountEmail" TEXT,
    "consentStatus" "ManagedConsentStatus" NOT NULL DEFAULT 'PENDING',
    "availableForTesting" BOOLEAN NOT NULL DEFAULT false,
    "currentlyAssigned" BOOLEAN NOT NULL DEFAULT false,
    "campaignsTested" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedTester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedCampaignTester" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "testingStatus" "ManagedAssignmentStatus" NOT NULL DEFAULT 'INVITED',
    "invitationStatus" "ManagedInvitationStatus" NOT NULL DEFAULT 'NOT_SENT',
    "optInStatus" "ManagedOptInStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confirmationStatus" "ManagedConfirmationStatus" NOT NULL DEFAULT 'NOT_CONFIRMED',
    "inviteTokenHash" TEXT,
    "inviteTokenExpiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "optedInAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedCampaignTester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedTesterConfirmation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "confirmedSetup" BOOLEAN NOT NULL DEFAULT true,
    "screenshotMime" TEXT,
    "screenshotBytes" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedTesterConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedTestingReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB,

    CONSTRAINT "ManagedTestingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingPackage_code_key" ON "ManagedTestingPackage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingPayment_publicId_key" ON "ManagedTestingPayment"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingPayment_transactionReference_key" ON "ManagedTestingPayment"("transactionReference");

-- CreateIndex
CREATE INDEX "ManagedTestingPayment_userId_idx" ON "ManagedTestingPayment"("userId");

-- CreateIndex
CREATE INDEX "ManagedTestingPayment_status_idx" ON "ManagedTestingPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingCampaign_publicId_key" ON "ManagedTestingCampaign"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingCampaign_paymentId_key" ON "ManagedTestingCampaign"("paymentId");

-- CreateIndex
CREATE INDEX "ManagedTestingCampaign_userId_idx" ON "ManagedTestingCampaign"("userId");

-- CreateIndex
CREATE INDEX "ManagedTestingCampaign_status_idx" ON "ManagedTestingCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTester_publicId_key" ON "ManagedTester"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTester_email_key" ON "ManagedTester"("email");

-- CreateIndex
CREATE INDEX "ManagedTester_consentStatus_availableForTesting_currentlyAss_idx" ON "ManagedTester"("consentStatus", "availableForTesting", "currentlyAssigned");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedCampaignTester_publicId_key" ON "ManagedCampaignTester"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedCampaignTester_inviteTokenHash_key" ON "ManagedCampaignTester"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "ManagedCampaignTester_campaignId_idx" ON "ManagedCampaignTester"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedCampaignTester_campaignId_testerId_key" ON "ManagedCampaignTester"("campaignId", "testerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTesterConfirmation_assignmentId_key" ON "ManagedTesterConfirmation"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedTestingReport_campaignId_periodKey_key" ON "ManagedTestingReport"("campaignId", "periodKey");

-- CreateIndex
CREATE INDEX "ManagedTestingReport_campaignId_idx" ON "ManagedTestingReport"("campaignId");

-- AddForeignKey
ALTER TABLE "ManagedTestingPayment" ADD CONSTRAINT "ManagedTestingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTestingPayment" ADD CONSTRAINT "ManagedTestingPayment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ManagedTestingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTestingCampaign" ADD CONSTRAINT "ManagedTestingCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTestingCampaign" ADD CONSTRAINT "ManagedTestingCampaign_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTestingCampaign" ADD CONSTRAINT "ManagedTestingCampaign_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "ManagedTestingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedCampaignTester" ADD CONSTRAINT "ManagedCampaignTester_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ManagedTestingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedCampaignTester" ADD CONSTRAINT "ManagedCampaignTester_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "ManagedTester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTesterConfirmation" ADD CONSTRAINT "ManagedTesterConfirmation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ManagedCampaignTester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedTestingReport" ADD CONSTRAINT "ManagedTestingReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ManagedTestingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed catalog packages
INSERT INTO "ManagedTestingPackage" ("id", "code", "name", "testerCount", "amountPkr", "currency", "contactOnly", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('pkg_testers_12', 'testers_12', '12 testers', 12, 7500, 'PKR', false, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pkg_testers_20', 'testers_20', '20 testers', 20, 11500, 'PKR', false, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pkg_testers_30', 'testers_30', '30 testers', 30, 16000, 'PKR', false, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pkg_testers_50', 'testers_50', '50 testers', 50, 25000, 'PKR', false, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pkg_custom', 'custom', 'Custom', 0, 0, 'PKR', true, true, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
