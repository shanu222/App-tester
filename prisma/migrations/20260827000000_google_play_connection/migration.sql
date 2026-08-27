-- Google Play integration: replace the Google Groups / Workspace feature with
-- first-class, per-developer Google Play connections.
--
-- Ordering is deliberate: dependent objects are dropped before their parents so
-- the migration is re-runnable against a database at the previous revision and
-- never leaves a dangling foreign key.

-- 1. Google Groups membership records (leaf table, no dependants).
DROP TABLE IF EXISTS "GoogleGroupMembership";

-- 2. Campaign -> GoogleGroup reference must go before GoogleGroup itself.
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_googleGroupId_fkey";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "googleGroupId";

-- 3. Google Groups themselves.
DROP TABLE IF EXISTS "GoogleGroup";

-- 4. Per-track group email is no longer meaningful.
ALTER TABLE "TestingTrack" DROP COLUMN IF EXISTS "googleGroupEmail";

-- 5. Retire the GOOGLE_WORKSPACE provider. Postgres cannot drop a single enum
--    value, so the stored credentials for the removed feature are deleted and
--    the type is rebuilt. Only Integration.provider uses this enum.
DELETE FROM "Integration" WHERE "provider" = 'GOOGLE_WORKSPACE';

ALTER TYPE "IntegrationProvider" RENAME TO "IntegrationProvider_old";
CREATE TYPE "IntegrationProvider" AS ENUM ('FACEBOOK', 'GOOGLE', 'GOOGLE_PLAY', 'GMAIL');
ALTER TABLE "Integration"
  ALTER COLUMN "provider" TYPE "IntegrationProvider"
  USING ("provider"::text::"IntegrationProvider");
DROP TYPE "IntegrationProvider_old";

-- 6. How a developer authorised TestLoop against Play Console.
CREATE TYPE "GooglePlayConnectionMethod" AS ENUM ('OAUTH', 'SERVICE_ACCOUNT');

-- 7. One authorised Play Console connection per developer. Credentials are
--    stored encrypted by the application layer and are never returned to a client.
CREATE TABLE "GooglePlayConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "GooglePlayConnectionMethod" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "googleAccountEmail" TEXT,
    "cloudProjectId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "encryptedCredentials" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GooglePlayConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GooglePlayConnection_userId_key" ON "GooglePlayConnection"("userId");
CREATE INDEX "GooglePlayConnection_status_idx" ON "GooglePlayConnection"("status");

ALTER TABLE "GooglePlayConnection"
  ADD CONSTRAINT "GooglePlayConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Cache of applications discovered in the developer's Play Console. Play
--    Console remains the source of truth; selecting an app links it to a
--    managed App row rather than copying the application into TestLoop.
CREATE TABLE "GooglePlayApp" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "appId" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GooglePlayApp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GooglePlayApp_connectionId_packageName_key" ON "GooglePlayApp"("connectionId", "packageName");
CREATE INDEX "GooglePlayApp_userId_idx" ON "GooglePlayApp"("userId");
CREATE INDEX "GooglePlayApp_packageName_idx" ON "GooglePlayApp"("packageName");

ALTER TABLE "GooglePlayApp"
  ADD CONSTRAINT "GooglePlayApp_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "GooglePlayConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GooglePlayApp"
  ADD CONSTRAINT "GooglePlayApp_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Campaign fields backing the public TestLoop testing page. testingUrl only
--    ever holds an official Google Play opt-in URL read back from the API.
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "playTrack" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "testingUrl" TEXT;

CREATE UNIQUE INDEX "Campaign_publicSlug_key" ON "Campaign"("publicSlug");
