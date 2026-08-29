-- AlterTable
ALTER TABLE "GooglePlayConnection" ADD COLUMN "maskedCredentialLabel" TEXT;
ALTER TABLE "GooglePlayConnection" ADD COLUMN "playSecretPresent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayServiceAccountSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "PlayServiceAccountSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayServiceAccountSecret_userId_key" ON "PlayServiceAccountSecret"("userId");

-- AddForeignKey
ALTER TABLE "PlayServiceAccountSecret" ADD CONSTRAINT "PlayServiceAccountSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing connected rows already hold a credential blob (OAuth or legacy SA).
UPDATE "GooglePlayConnection"
SET "playSecretPresent" = true
WHERE "status" = 'CONNECTED' AND "encryptedCredentials" IS NOT NULL;

-- Stop keeping service-account project ids on the application connection row.
UPDATE "GooglePlayConnection"
SET "cloudProjectId" = NULL
WHERE "method" = 'SERVICE_ACCOUNT';
