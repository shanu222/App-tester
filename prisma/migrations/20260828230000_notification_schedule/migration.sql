-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "notificationFrequency" TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE "UserSettings" ADD COLUMN "notificationTime" TEXT NOT NULL DEFAULT '16:00';
ALTER TABLE "UserSettings" ADD COLUMN "notificationTimezone" TEXT NOT NULL DEFAULT 'Asia/Karachi';
ALTER TABLE "UserSettings" ADD COLUMN "notificationWeekday" INTEGER NOT NULL DEFAULT 1;
