-- CreateTable
CREATE TABLE "EmailSignupOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSignupOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSignupOtp_firebaseUid_key" ON "EmailSignupOtp"("firebaseUid");

-- CreateIndex
CREATE INDEX "EmailSignupOtp_email_idx" ON "EmailSignupOtp"("email");
