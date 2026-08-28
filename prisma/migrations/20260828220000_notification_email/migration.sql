-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "notificationEmail" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "notificationEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserSettings" ADD COLUMN "pendingNotificationEmail" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "notificationEmailVerificationTokenHash" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "notificationEmailVerificationExpiresAt" TIMESTAMP(3);
ALTER TABLE "UserSettings" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserSettings" ADD COLUMN "notificationPreferences" JSONB;
ALTER TABLE "UserSettings" ADD COLUMN "lastNotificationSentAt" TIMESTAMP(3);
ALTER TABLE "UserSettings" ADD COLUMN "lastDailySummaryOn" TIMESTAMP(3);
ALTER TABLE "UserSettings" ADD COLUMN "lastDailySummaryStatus" TEXT;

-- AlterTable
ALTER TABLE "EmailEvent" ADD COLUMN "eventKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_eventKey_key" ON "EmailEvent"("eventKey");
