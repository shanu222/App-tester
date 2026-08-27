-- Persist the latest Google Play track/release snapshot per discovered app,
-- plus connection-level lastSyncAt for the Refresh from Google Play flow.

ALTER TABLE "GooglePlayConnection" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);

ALTER TABLE "GooglePlayApp" ADD COLUMN IF NOT EXISTS "tracksSnapshot" JSONB;
ALTER TABLE "GooglePlayApp" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
